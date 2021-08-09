import { expect as expectCDK, matchTemplate, MatchStyle, SynthUtils } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as CdkPipeline from '../lib/pipeline-stack';

test('Pipeline Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new CdkPipeline.PipelineStack(app, 'MyTestStack');
    // THEN
expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
