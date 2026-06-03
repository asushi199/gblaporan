# AGENTS.md

## 项目定位

- 这是一个给学校辅导老师使用的本地网页工具。
- 输入通常是中文个案摘要，输出是马来文 `Laporan Sesi Kaunseling Individu`。
- 报告内容必须贴近学校正式文书语气，避免花哨表达。

## 业务规则

- 只允许使用两种理论：`REBT` 与 `Teori Realiti (WDEP)`。
- 不可生成其他辅导理论、心理治疗流派或临床诊断内容。
- 如果资料不足，应写成仍在 `fasa membina hubungan` 或 `fasa meneroka masalah`，不要编造事实。
- 报告应保持 sesi 之间的延续性，后续 sesi 必须承接前面的未完成问题。

## 界面与交互

- 目标用户是非技术老师，界面要直接、清楚、低学习成本。
- 优先保留简单表单，不为了“设计感”牺牲可理解性。
- 对于关键字段，尽量使用老师熟悉的术语，例如 `Bilangan sesi`、`Fasa`、`Perkara`。

## 技术约定

- 项目使用原生 Node.js HTTP server，不引入不必要依赖。
- 前端保持轻量，优先使用原生 HTML、CSS、JavaScript。
- 任何新增逻辑都应优先补测试，测试使用 Node 内建 test runner。

## 发布与配置

- 本地模式允许用户自行填写 Gemini API key。
- 线上部署模式优先使用服务器环境变量 `GEMINI_API_KEY`。
- 不要把真实 API key、学生隐私资料或本地配置提交进 git。
