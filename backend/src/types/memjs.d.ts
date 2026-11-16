declare module "memjs" {
  type MemjsClient = {
    get(
      key: string,
      callback: (error: Error | null, value: Buffer | null) => void,
    ): void;
    set(
      key: string,
      value: string,
      options: { expires: number },
      callback: (error: Error | null) => void,
    ): void;
  };

  const memjs: {
    Client: {
      create(server: string): MemjsClient;
    };
  };

  export = memjs;
}
