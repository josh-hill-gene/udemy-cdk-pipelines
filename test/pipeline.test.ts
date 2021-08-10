import {
    expect as
        expectCDK,
    SynthUtils,
    haveResourceLike,
    arrayWith,
    objectLike
} from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { App } from '@aws-cdk/core';
import { BillingStack } from '../lib/billing-stack';
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
    const serviceStack = new ServiceStack(app, 'ServiceStack', { stageName: 'Test' });
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

test('Adding Billing Stack to a Stage', () => {
    // GIVEN
    const app = new App();
    const serviceStack = new ServiceStack(app, 'ServiceStackApp', { stageName: 'Test' });
    const pipelineStack = new PipelineStack(app, 'PipelineStack');
    const billingStack = new BillingStack(app, 'BillingStack', {
        budgetAmount: 5,
        emailAddress: 'test@example.com'
    });
    const testStage = pipelineStack.addServiceStage(serviceStack, 'Test');

    // WHEN
    pipelineStack.addBillingStackToStage(billingStack, testStage);

    // THEN
    expectCDK(pipelineStack).to(
        haveResourceLike('AWS::CodePipeline::Pipeline', {
            Stages: arrayWith(
                objectLike({
                    Actions: arrayWith(
                        objectLike({
                            Name: 'Billing_Update'
                        })
                    )
                })
            )
        }));
});
