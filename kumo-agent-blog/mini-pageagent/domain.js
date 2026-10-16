// The domain has no dependency on the DOM, browser APIs, or UI.
export function parseGoal(text) {
  const input = String(text || '').trim();
  if (!input) return { kind: 'invalid', reason: '请输入任务目标。' };
  if (/^(只看|筛选|过滤|显示).*(运行中|running)/i.test(input)) return { kind: 'filter', state: 'running' };
  if (/^(显示|恢复|查看).*(全部|所有)实例/.test(input)) return { kind: 'filter', state: 'all' };
  const create = input.match(/^(?:创建|新增)(?:一个)?(?:名为|叫做|名称为)?\s*[“"']?([A-Za-z][\w-]{2,24})[”"']?\s*(?:的实例)?$/);
  if (create) return { kind: 'create', name: create[1] };
  const search = input.match(/^(?:搜索|查找|查询)\s*[“"']?([^”"']{1,36})[”"']?$/);
  if (search) return { kind: 'search', query: search[1].trim() };
  const toggle = input.match(/^(启动|停止)\s*([A-Za-z][\w-]{2,24})$/);
  if (toggle) return { kind: 'toggle', name: toggle[2], state: toggle[1] === '启动' ? 'running' : 'stopped' };
  return { kind: 'invalid', reason: '当前演示支持筛选运行中、显示全部实例、搜索关键词、创建实例，以及启动或停止指定实例。' };
}
function action(snapshot, name, type, value, explanation) {
  const control = snapshot.controls.find(item => item.name === name);
  if (!control) return { kind: 'failed', reason: '页面中没有找到可操作控件「' + name + '」。' };
  return { kind: 'action', action: { type, ref: control.ref, value: value || '' }, explanation };
}
export function decide(goal, snapshot) {
  if (goal.kind === 'invalid') return { kind: 'failed', reason: goal.reason };
  const facts = snapshot.facts;
  if (goal.kind === 'filter') {
    if (facts.filter === goal.state) return { kind: 'done', message: '已验证实例筛选条件。' };
    return action(snapshot, goal.state === 'running' ? '运行中' : '全部实例', 'click', '', '切换实例筛选');
  }
  if (goal.kind === 'search') {
    if (facts.search === goal.query) return { kind: 'done', message: '已验证搜索关键词：' + goal.query };
    return action(snapshot, '搜索实例', 'input', goal.query, '输入搜索关键词');
  }
  if (goal.kind === 'create') {
    if (facts.instances.some(instance => instance.name === goal.name)) return { kind: 'done', message: '已验证实例「' + goal.name + '」存在。' };
    if (!facts.dialogOpen) return action(snapshot, '创建实例', 'click', '', '打开创建对话框');
    if (facts.draftName !== goal.name) return action(snapshot, '实例名称', 'input', goal.name, '填写实例名称');
    return action(snapshot, '确认创建', 'click', '', '提交创建并等待页面更新');
  }
  if (goal.kind === 'toggle') {
    const instance = facts.instances.find(row => row.name === goal.name);
    if (!instance) return { kind: 'failed', reason: '未找到实例「' + goal.name + '」，请检查名称。' };
    if (instance.status === goal.state) return { kind: 'done', message: '已验证「' + goal.name + '」的目标状态。' };
    const name = (goal.state === 'running' ? '启动 ' : '停止 ') + goal.name;
    return action(snapshot, name, 'click', '', '更新实例运行状态');
  }
  return { kind: 'failed', reason: '未知的任务类型。' };
}
