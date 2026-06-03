# 个辅报告生成器

这是一个给学校辅导老师使用的本地网页工具。  
老师可以用中文输入学生个案摘要，程序会根据既定规则生成马来文的 `Laporan Sesi Kaunseling Individu`。

## 功能概览

- 支持把中文个案资料整理成马来文个辅报告
- 默认模型为 `gemini-3.1-flash-lite`
- 可切换模型：`gemini-2.5-flash`、`gemini-3.5-flash`
- 支持一次生成多个 `sesi`
- 支持选择本次报告涵盖的 `fasa`
- 自动检查输出是否包含必要栏位、是否为 point form、是否只使用允许的理论
- 仅允许使用 `REBT` 与 `Teori Realiti (WDEP)`

## 当前业务规则

- 输入语言可以是中文
- 输出报告语言固定为马来文
- 不允许生成其他辅导理论
- 不应编造临床诊断、家庭背景细节或输入中没有提供的事实
- 如果个案资料不足，应保守写成仍在建立关系或探索问题阶段
- 多个 sesi 之间应有延续性，而不是每篇都像全新个案

## 本地运行

项目没有额外 npm 依赖，因此不需要安装第三方包。

1. 在项目目录运行：

```bash
npm.cmd start
```

2. 打开浏览器访问：

```text
http://localhost:3000
```

3. 在页面中填写：
- Gemini API key
- Bilangan sesi
- Fasa
- 中文个案描述

4. 点击 `Jana laporan`

## 测试

运行：

```bash
npm.cmd test
```

目前测试覆盖的重点包括：

- sesi 分批逻辑
- prompt 中的理论限制
- fasa 输入校验
- 报告结构与 point form 校验

## 线上部署

这个项目已经附带 [render.yaml](/C:/CodexProject/autoreport/render.yaml)，最适合先部署到 Render 给老师测试。

### Render 部署步骤

1. 把项目推送到 GitHub
2. 在 Render 新建 `Web Service`
3. 连接这个 GitHub 仓库
4. Render 会自动读取 `render.yaml`
5. 在 Render 后台添加环境变量：

```text
GEMINI_API_KEY=你的 Gemini key
```

6. 部署完成后，把生成的网址发给老师即可

### 线上模式说明

- 如果服务器已设置 `GEMINI_API_KEY`，老师打开网页时无需自己输入 key
- 页面会显示 API key 由服务器管理
- 这适合给非技术用户测试

## 目录结构

```text
public/   前端页面与样式
src/      生成逻辑、校验逻辑、设置存储
tests/    Node 内建测试
server.js 本地与线上共用的 Node 服务器
```

## 注意事项

- 本地 key 会保存到 `data/settings.local.json`
- 该文件已加入 `.gitignore`
- 正式使用前，老师仍应人工复核生成内容
