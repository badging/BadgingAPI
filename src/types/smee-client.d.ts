declare module 'smee-client' {
  interface SmeeClientOptions {
    source: string;
    target: string;
    logger?: Console;
  }

  interface SmeeEvents {
    close(): void;
  }

  class SmeeClient {
    constructor(options: SmeeClientOptions);
    start(): SmeeEvents;
  }

  export default SmeeClient;
}
