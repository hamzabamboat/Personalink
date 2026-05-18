import { defineConfig } from 'checkly'
import { EmailAlertChannel } from 'checkly/constructs'

const emailAlert = new EmailAlertChannel('email-alert', {
  address: process.env.ALERT_EMAIL ?? 'hamzabamboat@gmail.com',
  sendFailure: true,
  sendRecovery: true,
  sendDegraded: false,
})

export default defineConfig({
  projectName: 'Personalink',
  logicalId: 'personalink-monitoring',
  checks: {
    activated: true,
    muted: false,
    runtimeId: '2024.09',
    frequency: 10,
    locations: ['us-east-1', 'eu-west-1'],
    tags: ['personalink'],
    alertChannels: [emailAlert],
    browserChecks: {
      testMatch: '__checks__/**/*.spec.ts',
    },
  },
  cli: {
    runLocation: 'us-east-1',
    reporters: ['list'],
  },
})
