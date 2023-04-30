import { Config, Output } from '@pulumi/pulumi';
import { subDays } from 'date-fns';

export interface GetTokenOptions {
  type: 'npm' | 'github';

  /**
   * Config name to use
   * @default npm-token or github-token
   */
  configTokenName?: string;

  /**
   * config name
   *
   * used to construct Pulumi config
   */
  configName?: string;

  /**
   * How many days before the token expires
   * we fail to promote renewing
   * @default 10
   **/
  expiryDays?: number;
}

export function getToken(opts: GetTokenOptions): Output<string> {
  const { type, configName, configTokenName, expiryDays = 10 } = opts;

  const config = new Config(configName);

  const resolvedConfigTokenName =
    configTokenName ?? type === 'npm' ? 'npm-token' : 'github-token';

  const expirtyDateRaw = config.requireSecret(
    `${resolvedConfigTokenName}-expires-at`,
  );

  return expirtyDateRaw.apply(expiry => {
    const expiryDate = new Date(expiry);
    const minus10Days = subDays(new Date(), expiryDays);

    if (expiryDate < minus10Days) {
      throw new Error(
        `Token for ${type} expires on ${expiryDate}. Failing to promote renewing!`,
      );
    }

    return config.requireSecret(resolvedConfigTokenName);
  });
}
