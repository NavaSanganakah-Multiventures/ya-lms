export class LiveClassCreditManager {
  state: any;
  env: any;

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: any) {
    let url = new URL(request.url);
    if (url.pathname === "/start") {
      await this.state.storage.setAlarm(Date.now() + 60 * 1000);
      return new Response("started");
    }
    if (url.pathname === "/stop") {
      await this.state.storage.deleteAlarm();
      return new Response("stopped");
    }
    return new Response("ok");
  }

  async alarm() {
    console.log("alarm fired");
    await this.state.storage.setAlarm(Date.now() + 60 * 1000);
  }
}
