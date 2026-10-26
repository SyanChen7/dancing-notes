# Dancing Notes Starter

这个包提供已调过的连续跳跃、入场、圆环、轨迹、纸面彩光、景深和镜头，让你的 Agent 不必从零猜效果。

**它不是“拖入任意 MIDI 就自动生成”的软件。** 新曲仍需 Agent 将 MIDI 与 MXL 的真实音符位置对应，并生成镜头路径。包内不含巴赫/肖邦音乐、录音、谱面坐标或成片；空数据启动会明确显示“待配置”，不是假演示。

## 直接发给 Agent

> 请先阅读本包 README 和 docs/换曲说明.md，复用 src 中的视觉和连续跳跃实现，不要重新设计效果。我的素材在：[目录]。检查并安装缺少的兼容依赖，用我的MXL生成SVG，从实际符头获取坐标，用MIDI建立完整映射，生成src/score-data.json和镜头路径。处理和弦、延音、倚音/颤音、反复和换行；不能套用旧曲时间或均匀铺点。真人音频先验证同步，不同步则用同一MIDI生成音轨。先做短片段低清预览并核对映射，再导出所需时长的1080p视频。遇到未匹配音符请报告并修复，不要跳过。

## 怎样使用

本目录是 Skill 内置源码模板。请用 Skill 的 `scripts/create_project.py` 复制到新的独立工作目录；脚本会把 `package.json.template` 转为 `package.json`。不要在 Skill 的 assets 内安装依赖或生成作品。

在生成后的独立工作目录打开终端或让 Agent 操作。不要把这个 package.json 直接覆盖到已有项目；已有项目只合并所需代码/兼容依赖。

1. 已验证 macOS arm64、Node.js 22.18.0 / npm 10.9.3；需安装FFmpeg/FFprobe。Python3仅用于可选的read-music.py（仅标准库）。
2. npm install：使用包里锁定的依赖版本。所有Remotion/@remotion包必须同版本。初次浏览器下载可能需要网络。
3. npm run studio：空模板只显示待配置提示。
4. 让Agent完成自己曲目的SVG、音频和score-data.json。
5. npm test、npm run typecheck，然后 npm run validate。
6. npm run render：先导出无音轨画面，再按入场时长延迟原始音轨，成片在 output/music-score.mp4。
   GPU环境有兼容问题时由Agent诊断；可以尝试 npm run render -- --gl=angle，不要不分操作系统盲目套用。

正式成片不应带“待配置”提示；render命令会拒绝空数据。前端只读取生成好的数据，不在每帧解析MIDI/MXL。

## 路径与素材放置

先进入 create_project.py 创建的、含 `package.json` 的工作目录，再运行 npm 命令；不要在压缩包外层或其他项目根目录执行。`node scripts/validate.mjs` 和 `node scripts/render.mjs` 的内部路径现在以脚本所属项目定位，从其他目录用脚本的完整路径启动也可工作。

`public/score/score.svg` 和 `public/score/piano.wav` **有意不随包提供**，需要用自己的曲目生成。它们不是作者机器上的外部链接。`src/score-data.json` 中应写 `score/score.svg` 和 `score/piano.wav`，不加 `public/` 前缀，不写本地绝对路径或反斜杠。

制谱结果在 `output/engraved/page-1.svg` 等文件中；选定单页后，将该页复制为 `public/score/score.svg`。多页需先拼接并同步变换全部坐标，不能直接把第一页当整首。将已对齐的音轨放为 `public/score/piano.wav`。如果使用其他文件名，同时修改 JSON 中的相应路径。

`output/analysis/identified.musicxml`、`music-analysis.json`、`output/engraved/`、`output/geometry.json` 和 `output/music-score.mp4` 是流水线输出，首次解压时不存在是正常的。制谱、坐标和读取脚本的命令行输入/输出参数按终端当前目录解释；推荐按本文从包根目录执行。

## 包里最有用的文件

| 文件 | 作用 | 换曲时是否需要改 |
|---|---|---|
| src/performance.ts | 连续起落、短入场、休止淡出、重复音小跳、和弦主落点 | 通常不改；特殊节奏需验证 |
| src/MusicScoreVisualizer.tsx | 小球核心、圆环、细轨迹、纸面彩光、SVG纹理、后期处理 | 尽量保留 |
| src/settings.json | 已调好的镜头距离、基础亮度、曝光等默认参数 | 按谱面密度微调 |
| src/camera.ts | 按镜头路径平滑插值，无肖邦换行时刻 | 路径数据要重建 |
| src/types.ts | 新曲数据接口 | 通常不改 |
| src/compositions.tsx | 注册Composition，按新曲时长计算帧数 | 可改尺寸；不是效果诀窍 |
| scripts/read-music.py | 读取MXL结构及MIDI tempo、音符事件 | 有明确支持边界 |
| scripts/engrave.mjs | Verovio输出带稳定ID的SVG | 按曲目选择页/范围 |
| scripts/note-geometry.mjs | 读取SVG中真实notehead坐标 | 每次换谱面重跑 |
| scripts/validate.mjs | 检查数据完整性和素材是否存在 | 不能代替音乐正确性审核 |
| scripts/render.mjs | 视频渲染和带入场偏移的音轨封装 | 通常不改 |

## 保留这些效果原则

- 球落地后直接开始下一跳，禁止停顿后猛冲赶节奏。
- 每个实际起音都有ring；和弦全部亮环，但每个staff只保留一个主球。
- 球身光晕小，纸面照亮范围宽；纸面暗但音符可辨。
- 真实3D近距离镜头，确保手机缩小观看仍看清球与符头关系。
- 每次换曲都重建坐标、时间、镜头，不重用上一首score-data。
- MIDI是动画时间源；录音必须单独验证，不能靠波形音量代替音符。

## 支持边界

目前视觉为钢琴双谱表（staff 1/2）和一张SVG纸面。可容纳同页多行，没有自动翻页/任意曲目对齐器。多页需Agent明确拼接SVG并变换所有坐标，或实现换页。

读取工具支持单一piano part的普通MusicXML内容的MXL和PPQ计时的SMF 0/1。反复、不同版本、移调、特殊装饰音、多个part等仍需Agent处理。不要把脚本“解析成功”误当成“已正确对齐”。

换行没有休止时，需设计镜头过渡并验证；不能照搬在休止时淡出再入场的策略，导致漏掉持续演奏。

音频输入应从音乐时间0开始、与MIDI已对齐，不预加开场静音；render脚本统一添加。包不含钢琴音源，需自行准备/生成音轨。

## 验证与来源

视觉参数来自已制作的巴赫/肖邦效果，分享副本已去除曲名、38.4秒截断、固定两行和固定换行时刻。没有打包原录音、乐谱、依赖目录或个人路径。

依赖版本来自原项目已运行环境；分享副本的验证范围见 docs/验证记录.md。不同平台的首次安装、浏览器及WebGL还需本机实测，不能保证任意设备开箱即用。

依赖分别遵循各自许可；Verovio由npm安装，仅在离线制谱步骤使用。原始录音、下载曲谱和音源不因使用本代码而获得再分发授权。

## 原创作者与许可证

Creator：**言说新事 (SyanChen7)**。官方项目：[Dancing Notes](https://github.com/SyanChen7/dancing-notes)；[Douyin](https://v.douyin.com/sJT9y3rtEjU/)。原创代码与文档采用 [MIT License](LICENSE)。欢迎使用、修改和分享，重新分发代码时请保留原始版权与许可声明；作品注明项目出处值得感谢，但不是新增许可条件。
