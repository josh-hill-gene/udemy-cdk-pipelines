import { expect as expectCDK, matchTemplate, MatchStyle, SynthUtils, haveResourceLike, arrayWith, objectLike } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { App } from '@aws-cdk/core';
import { PipelineStack } from '../lib/pipeline-stack';
import { ServiceStack } from '../lib/service-stack';

test('Pipeline Stack', () => {
    // GIVEN
    const app = new cdk.App();
    // WHEN
    const stack = new PipelineStack(app, 'MyTestStack');
    // THEN
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('Adding Service Stage', () => {
    // GIVEN
    const app = new App();
    const serviceStack = new ServiceStack(app, 'ServiceStack');
    const pipelineStack = new PipelineStack(app, 'PipelineStack');

    // WHEN
    pipelineStack.addServiceStage(serviceStack, 'Test');

    // THEN
    expectCDK(pipelineStack).to(
        haveResourceLike('AWS::CodePipeline::Pipeline', {
            Stages: arrayWith(
                objectLike({
                    Name: 'Test'
                })
            )
        }));
});
