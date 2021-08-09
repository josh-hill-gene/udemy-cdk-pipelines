#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { UdemyCdkPipelinesStack } from '../lib/udemy-cdk-pipelines-stack';
import { BillingStack } from '../lib/billing-stack';

const app = new cdk.App();
new UdemyCdkPipelinesStack(app, 'UdemyCdkPipelinesStack', {});
new BillingStack(app, 'BillingStack', {
  budgetAmount: 5,
  emailAddress: 'me@joshuahill.dev'
});
