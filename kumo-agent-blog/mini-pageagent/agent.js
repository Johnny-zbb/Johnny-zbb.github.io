// Application service: one deep operation hides observe/plan/act/verify details.
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export class AgentRunner {
  constructor({ page, planner, publish, maxTurns = 8 }) {
    this.page = page;
    this.planner = planner;
    this.publish = publish;
    this.maxTurns = maxTurns;
    this.generation = 0;
    this.running = false;
  }
  stop() {
    this.generation += 1;
    if (this.running) this.publish({ kind: 'stopped', message: '任务已中止，没有执行后续动作。' });
    this.running = false;
  }
  async run(goal) {
    this.stop();
    const generation = ++this.generation;
    this.running = true;
    this.publish({ kind: 'started', message: '开始任务 · 最多 ' + this.maxTurns + ' 轮' });
    try {
      for (let turn = 1; turn <= this.maxTurns; turn++) {
        if (generation !== this.generation) return;
        const snapshot = await this.page.observe();
        if (generation !== this.generation) return;
        this.publish({ kind: 'observe', turn, message: '观察页面 · ' + snapshot.controls.length + ' 个可操作元素', snapshot: snapshot.text });
        const decision = this.planner(goal, snapshot);
        if (decision.kind === 'done') {
          this.publish({ kind: 'completed', turn, message: decision.message });
          return;
        }
        if (decision.kind === 'failed') throw new Error(decision.reason);
        this.publish({ kind: 'plan', turn, message: decision.explanation + ' · ref=e' + decision.action.ref });
        await this.page.preview(decision.action.ref);
        if (generation !== this.generation) return;
        const outcome = await this.page.execute(decision.action);
        if (generation !== this.generation) return;
        if (!outcome.ok) throw new Error(outcome.summary);
        this.publish({ kind: 'act', turn, message: decision.action.type + ' e' + decision.action.ref + ' · ' + outcome.summary });
        await sleep(180);
      }
      if (generation === this.generation) throw new Error('达到最大轮次，目标未被验证。');
    } catch (error) {
      if (generation === this.generation) this.publish({ kind: 'failed', message: error instanceof Error ? error.message : String(error) });
    } finally {
      if (generation === this.generation) this.running = false;
    }
  }
}
