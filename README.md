# Squeekchain

一个介绍 **Squeekchain - Hamster Powered Blockchain** 的中文单页网站。原创仓鼠跑轮插画、四步工作流程、SQK 说明及原生折叠 FAQ，支持手机与键盘操作。跑轮可以启动、暂停，并明确标注为插画演示。

使用 Vite、TypeScript 和原生 HTML/CSS。这个规模的静态介绍站不需要额外的 UI 框架。无后端、钱包连接、交易或实时链上数据；所有字体、图标和分享图片都本地提供。

## 安装、开发与预览

使用 Node.js 22 或更新版本与 npm。在仓库根目录执行：

```sh
npm ci
npm run dev
```

生产构建与预览：

```sh
npm run typecheck
npm run build
npm run preview
```

访问命令输出的预览地址。也可以用任何静态 HTTP 服务器直接服务 `dist/`。网站使用 `base: './'`、相对资源链接和页内锚点，可放在静态托管的子路径下，无需路由重写。

`dist/index.html` 和 `dist/assets/` 是随源代码交付的生产导出，不能在提交时忽略。重建会刷新整个导出。`package-lock.json` 固定构建依赖；无需重新生成字体或分享卡即可重建网站。

## 内容与素材修改

页面结构、文案和原创 SVG 位于 `index.html`，样式与设计变量在 `src/style.css`，跑轮状态逻辑在 `src/main.ts`。设计系统详见 [DESIGN.md](DESIGN.md)。

Nunito 与 Noto Sans SC 字体位于 `src/assets/`，随站点发布的许可证在 `public/font-licenses.txt`。中文字体保留了当前文案用到的 12 个原始 Unicode 分片。增加新文案后，可在临时工具目录安装 `@fontsource-variable/noto-sans-sc@5.3.1`，然后刷新字体分片：

```sh
node scripts/prepare-fonts.mjs /tmp/squeekchain-fonts/node_modules/@fontsource-variable/noto-sans-sc
npm run build
```

分享卡源文件是 `design/share-card.svg`，生成的 `public/og-image.png` 已包含在导出中。使用下面的 Playwright 工具安装后可重新生成：

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/squeekchain-browsers node scripts/render-share.mjs /tmp/squeekchain-validation/node_modules/playwright/index.mjs
npm run build
```

## 实际验证结果

最终生产构建与类型检查均退出 0。工作时构建工具安装在临时目录，执行了项目中的 `npm run build` 与 `npm run typecheck` 脚本；构建不依赖该临时目录中的任何运行时素材。

- 指定的 taste@1 探针：**16/16 通过**，并阻止了外部网络请求。
- 生产导出交互验证：**16 组检查通过**，覆盖 320、390、768、1024、1440px 重排、手机首屏、主导航、跑轮启停、减少动态效果、四个 FAQ、跳过导航、可见焦点、200% 文字放大及本地分享资源。
- axe 自动无障碍扫描：26 条规则通过，0 违规，0 待手动确认项。它不等同于完整无障碍认证。
- Chromium 的实际导出已通过浏览器工具检查；无控制台错误、页面脚本错误或本地资源失败。WebKit 因运行依赖不可用而未启动，Safari 与真机行为未验证；也未进行屏幕阅读器和原生浏览器 200% 缩放测试。

可复查的报告在 [artifacts/validation.md](artifacts/validation.md)，实测 JSON 在 `artifacts/interaction-results.json` 与 `artifacts/taste-results.json`。最终截图：[手机首屏](artifacts/mobile.png)、[桌面整页](artifacts/desktop.png)。

## 复现交互检查

验证工具可装在仓库外，避免把依赖或缓存加入提交：

```sh
npm install --prefix /tmp/squeekchain-validation --cache /tmp/squeekchain-npm-cache --no-audit --no-fund playwright@1.64.1 @axe-core/playwright@4.14.0
PLAYWRIGHT_BROWSERS_PATH=/tmp/squeekchain-browsers /tmp/squeekchain-validation/node_modules/.bin/playwright install chromium webkit
PLAYWRIGHT_BROWSERS_PATH=/tmp/squeekchain-browsers node scripts/validate.mjs --playwright /tmp/squeekchain-validation/node_modules/playwright/index.mjs --axe /tmp/squeekchain-validation/node_modules/@axe-core/playwright/dist/index.mjs
```

脚本在一次有界前台命令中启动静态预览，使用 `/preview/` 子路径检查实际 `dist/`，最后关闭浏览器和服务器。临时结果写到 `test/scratch/validation/`，网站构建不依赖该目录。若 WebKit 启动失败，报告会单列限制；已启动浏览器中的断言失败会使命令退出非零。

本次也运行了任务提供的探针：

```sh
IMD_PLAYWRIGHT=/tmp/squeekchain-validation/node_modules/playwright/index.mjs PLAYWRIGHT_BROWSERS_PATH=/tmp/squeekchain-browsers node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline
```

探针是任务输入，交付后可能不再存在，因此已保留本次测量摘要与截图。常规构建和交互验证不依赖 `.imd/`。

## 来源

项目事实取自任务说明，没有添加合约地址、代币兑换比例、发行量或投资承诺。设计指南、文档方法与字体的来源和许可证见 [docs/NOTICE.md](docs/NOTICE.md)。
