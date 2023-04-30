import { createInterface } from 'readline';
import { automation } from '@pulumi/pulumi';
import { addDays } from 'date-fns';
import dedent from 'dedent';
import { execa } from 'execa';

export interface TokenArgs {
  /**
   * Name of the config to use
   * @default npm or github
   */
  configName?: string;

  /**
   * Rotation interval in days
   *
   * @default 90
   */
  rotationDays?: number;

  /**
   * @default process.stdin
   */
  input?: NodeJS.ReadableStream;

  /**
   * @default process.stdout
   */
  output?: NodeJS.WritableStream | undefined;
}

export interface GitHubTokenArgs extends TokenArgs {
  type: 'github-fine-grained' | 'github-classic';

  tokenId?: string | undefined;
}

export interface NpmTokenArgs extends TokenArgs {
  type: 'npm';
  username?: string | undefined;
}

export type Args = GitHubTokenArgs | NpmTokenArgs;

async function openGitHubTokenPage(
  type: 'github-fine-grained' | 'github-classic',
  tokenId: string,
) {
  if (type === 'github-fine-grained') {
    await execa('open', [
      `https://github.com/settings/personal-access-tokens/${tokenId}`,
    ]);
  } else if (type === 'github-classic') {
    await execa('open', [`https://github.com/settings/tokens/${tokenId}`]);
  }
}

export async function updateToken(args: Args): Promise<void> {
  const {
    configName = args.type === 'npm' ? 'npm-token' : 'github-token',
    type,
    rotationDays = 90,
    input = process.stdin,
    output = process.stdout,
  } = args;

  const readline = createInterface({
    input,
    output,
  });

  const stack = await automation.LocalWorkspace.selectStack({
    stackName: 'prod',
    workDir: './',
  });

  if (type === 'npm' && args.username) {
    output.write(
      dedent`


        Hello 👋

        The browser will open to NPM, where you can generate a new token.
        Remember to choose ${rotationDays} days expiration time. We will assume that you
        do, so the system will not ask you again for a while.
        
      `,
      'utf-8',
    );
    await execa('open', [
      `https://www.npmjs.com/settings/${args.username}/tokens/`,
    ]);
  } else if (type === 'github-fine-grained' || type === 'github-classic') {
    output.write(
      dedent`


        Hello 👋

        The browser will open to GitHub, where you can generate a new token.
        Remember to choose ${rotationDays} days expiration time. We will assume that you
        do, so the system will not ask you again for a while.
        
      `,
      'utf-8',
    );

    const tokenId = await stack.getConfig(`${configName}-id`);

    if (tokenId.value) {
      openGitHubTokenPage(type, tokenId.value);
    } else if (args.tokenId) {
      openGitHubTokenPage(type, args.tokenId);
    } else {
      await execa('open', ['https://github.com/settings/tokens?type=beta']);
    }
  } else {
    output.write(
      dedent`


        Hello 👋

        You now need to generate a new token.
        Remember to choose ${rotationDays} days expiration time. We will assume that you
        do, so the system will not ask you again for a while.
        
      `,
      'utf-8',
    );
  }

  readline.question('Enter your token: ', async token => {
    readline.close();

    if (!token) {
      throw new Error('Token is required');
    }

    await stack.setConfig(configName, {
      secret: true,
      value: token,
    });

    await stack.setConfig(`${configName}-expires-at`, {
      secret: false,
      value: addDays(new Date(), rotationDays).toISOString(),
    });

    output.write(`Token ${configName} updated!`);
  });
}
