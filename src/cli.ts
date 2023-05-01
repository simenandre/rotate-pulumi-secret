#!/usr/bin/env node
import { Builtins, Cli, Command, Option } from 'clipanion';
import * as t from 'typanion';
import { updateToken } from './main.js';

class BaseCommand extends Command {
  rotationDays = Option.String('--rotation-days', {
    validator: t.isNumber(),
    required: false,
  });

  stack = Option.String('--stack', {
    required: true,
    description: 'Pulumi stack name.',
  });

  workDir = Option.String('--work-dir', {
    required: false,
    description: 'Pulumi working directory (defaults to ./)',
  });

  async execute() {
    this.context.stdout.write('Hello!\n');
  }
}

class ChangeNPMToken extends BaseCommand {
  static override paths = [['npm']];

  static override usage = Command.Usage({
    description: 'Changes a NPM token',
    details: `
      This commands first opens the local browser, only if the \`--username\` is set.

      Then it prompts the user to enter the new token, before it stores it
      in the Pulumi config as a secret.
    `,
    examples: [
      ['Simple', '$0 npm'],
      [
        'Setting a new token that opens browser and uses a user-defined name',
        '$0 npm --config-name npm --username my-username',
      ],
      ['Changing the rotation days to 30', '$0 npm --rotation-days 30'],
    ],
  });

  configName = Option.String('--config-name', {
    required: false,
    description:
      'Config name, used as key in Pulumi config. Defaults to "npm-token".',
  });

  username = Option.String('--username', {
    required: false,
    description: 'NPM username',
  });

  override async execute() {
    await updateToken({
      type: 'npm',
      configName: this.configName ?? 'npm-token',
      rotationDays: Number(this.rotationDays ?? 90),
      username: this.username,
      input: this.context.stdin,
      output: this.context.stdout,
      workDir: this.workDir ?? process.cwd(),
      stack: this.stack,
    });
  }
}

class ChangeGitHubToken extends BaseCommand {
  static override paths = [['github']];

  static override usage = Command.Usage({
    description: 'Changes a GitHub token',
    details: `
      This commands first opens the local browser, only if either \`--token-id\` is set or the token id is stored in
      Pulumi config as \`<config name>-id\` (ex. 'github-token-id').

      Then it prompts the user to enter the new token, before it stores it
      in the Pulumi config as a secret.
    `,
    examples: [
      ['Simple', '$0 github'],
      [
        'Using token ID to open browser and uses a user-defined name',
        '$0 github --config-name small-github-token --id-token 1234567890',
      ],
      ['Changing the rotation days to 30', '$0 npm --rotation-days 30'],
    ],
  });

  type = Option.String('--type', {
    required: false,
    description: 'Type of GitHub token (default is "github-fine-grained")',
    validator: t.isEnum(['github-fine-grained', 'github-classic']),
  });

  configName = Option.String('--config-name', {
    required: false,
    description:
      'Config name, used as key in Pulumi config (defaults to "github-token")',
  });

  tokenId = Option.String('--token-id', {
    required: false,
    description:
      'The ID from the GitHub token URL. e.g. `https://github.com/settings/personal-access-tokens/<token-id>`',
  });

  override async execute() {
    const type = this.type ?? 'github-fine-grained';
    await updateToken({
      type:
        type === 'github-fine-grained'
          ? 'github-fine-grained'
          : 'github-classic',
      configName: this.configName ?? 'github-token',
      rotationDays: Number(this.rotationDays ?? 90),
      tokenId: this.tokenId,
      input: this.context.stdin,
      output: this.context.stdout,
      workDir: this.workDir ?? process.cwd(),
      stack: this.stack,
    });
  }
}

const [, , ...args] = process.argv;

const cli = new Cli({
  binaryName: 'rotate-pulumi-secret',
  binaryLabel: 'Rotate Pulumi Tokens',
});

cli.register(Builtins.HelpCommand);
cli.register(ChangeNPMToken);
cli.register(ChangeGitHubToken);
cli.runExit(args);
