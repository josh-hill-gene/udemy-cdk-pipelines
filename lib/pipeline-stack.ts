import * as cdk from '@aws-cdk/core';
import { Artifact, IStage, Pipeline } from '@aws-cdk/aws-codepipeline';
import { CloudFormationCreateUpdateStackAction, CodeBuildAction, CodeBuildActionType, GitHubSourceAction } from '@aws-cdk/aws-codepipeline-actions';
import { SecretValue } from '@aws-cdk/core';
import { BuildEnvironmentVariableType, BuildSpec, LinuxBuildImage, PipelineProject } from '@aws-cdk/aws-codebuild';
import { ServiceStack } from './service-stack';
import { BillingStack } from './billing-stack';

export class PipelineStack extends cdk.Stack {

  private readonly pipeline: Pipeline;
  private readonly cdkBuildOutput: Artifact;
  private readonly serviceBuildOutput: Artifact;
  private readonly serviceSourceOutput: Artifact;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.pipeline = new Pipeline(this, 'Pipeline', {
      pipelineName: 'Pipeline',
      crossAccountKeys: false,
      restartExecutionOnUpdate: true
    });

    const cdkSourceOutput = new Artifact('CDKSourceOutput');
    this.serviceSourceOutput = new Artifact('ServiceSourceOutput');

    this.pipeline.addStage({
      stageName: 'Source',
      actions: [
        new GitHubSourceAction({
          owner: 'josh-hill-gene',
          repo: 'udemy-cdk-pipelines',
          branch: 'main',
          actionName: 'Pipeline_Source',
          oauthToken: SecretValue.secretsManager('github-pipeline-pat'),
          output: cdkSourceOutput
        }),
        new GitHubSourceAction({
          owner: 'josh-hill-gene',
          repo: 'udemy-cdk-pipelines-server',
          branch: 'main',
          actionName: 'Service_Source',
          oauthToken: SecretValue.secretsManager('github-pipeline-pat'),
          output: this.serviceSourceOutput
        })
      ]
    });

    this.cdkBuildOutput = new Artifact('CdkBuildOutput');
    this.serviceBuildOutput = new Artifact('ServiceBuildOutput');

    this.pipeline.addStage({
      stageName: 'Build',
      actions: [
        new CodeBuildAction({
          actionName: 'CDK_Build',
          input: cdkSourceOutput,
          outputs: [
            this.cdkBuildOutput
          ],
          project: new PipelineProject(this, 'CdkBuildProject', {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0
            },
            buildSpec: BuildSpec.fromSourceFilename('build-specs/cdk-build-spec.yml')
          })
        }),
        new CodeBuildAction({
          actionName: 'Service_Build',
          input: this.serviceSourceOutput,
          outputs: [
            this.serviceBuildOutput
          ],
          project: new PipelineProject(this, 'ServiceBuildProject', {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0
            },
            buildSpec: BuildSpec.fromSourceFilename('build-specs/service-build-spec.yml')
          })
        })
      ]
    });

    this.pipeline.addStage({
      stageName: 'Pipeline_Update',
      actions: [
        new CloudFormationCreateUpdateStackAction({
          actionName: 'Pipeline_Update',
          stackName: 'PipelineStack',
          templatePath: this.cdkBuildOutput.atPath('PipelineStack.template.json'),
          adminPermissions: true
        })
      ]
    });
  }

  public addServiceStage(serviceStack: ServiceStack, stageName: string): IStage {
    return this.pipeline.addStage({
      stageName: stageName,
      actions: [
        new CloudFormationCreateUpdateStackAction({
          actionName: 'Service_Update',
          stackName: serviceStack.stackName,
          templatePath: this.cdkBuildOutput.atPath(`${serviceStack.stackName}.template.json`),
          adminPermissions: true,
          parameterOverrides: {
            ...serviceStack.serviceCode.assign(this.serviceBuildOutput.s3Location)
          },
          extraInputs: [this.serviceBuildOutput
          ],
        })
      ]
    });
  }

  public addBillingStackToStage(billingStack: BillingStack, stage: IStage) {
    stage.addAction(new CloudFormationCreateUpdateStackAction({
      actionName: 'Billing_Update',
      stackName: billingStack.stackName,
      templatePath: this.cdkBuildOutput.atPath(`${billingStack.stackName}.template.json`),
      adminPermissions: true
    }));
  };

  // it was important to commit this file ahead of changes made in the same session
  // to avoid cyclical dependencies. might not be idempotent, and cdk destroy --all fails :(
  public addServiceIntegrationTestToStage(stage: IStage, serviceEndpoint: string) {
    stage.addAction(new CodeBuildAction({
      actionName: 'Integration_Tests',
      input: this.serviceSourceOutput,
      project: new PipelineProject(this, 'ServiceIntegrationTestsProject', {
        environment: {
          buildImage: LinuxBuildImage.STANDARD_5_0
        },
        buildSpec: BuildSpec.fromSourceFilename('build-specs/integ-test-build-spec.yml')
      }),
      environmentVariables: {
        SERVICE_ENDPOINT: {
          value: serviceEndpoint,
          type: BuildEnvironmentVariableType.PLAINTEXT,
        },
      },
      type: CodeBuildActionType.TEST,
      runOrder: 2
    }));
  }

}
