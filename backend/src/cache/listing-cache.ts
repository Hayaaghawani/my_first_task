import memjs = require("memjs");
import type { AppConfig } from "../config/env";

export class ListingCache {
  private readonly client: ReturnType<typeof memjs.Client.create>;

  constructor(config: AppConfig["memcached"]) {
    this.client = memjs.Client.create(`${config.host}:${config.port}`);
  }

  get<TValue>(key: string): Promise<TValue | null> {
    return new Promise((resolve, reject) => {
      this.client.get(key, (error, value) => {
        if (error) {
          reject(error);
          return;
        }
        if (value === null) {
          resolve(null);
          return;
        }

        try {
          resolve(JSON.parse(value.toString()) as TValue);
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
  }

  set<TValue>(input: { key: string; value: TValue; ttlSeconds: number }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.set(input.key, JSON.stringify(input.value), { expires: input.ttlSeconds }, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}
