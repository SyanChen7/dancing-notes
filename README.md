**简体中文** | [English](README.en.md)

![Dancing Notes：发光小球沿曲谱跳跃的效果示意](assets/showcase/dancing-notes-hero.png)

# Dancing Notes · 跳跃的音符

让发光小球随音乐沿真实符头连续跳跃，生成带有光环、轨迹、纸面彩光和景深的 3D 曲谱动画。

提供曲名或已有资料，Agent 会检查文件夹、查找缺失曲谱、核对 MIDI 与音频，复用内置动画模板制作作品。

## 效果示范

[查看 / 下载示范视频：dancing-notes-sample.mp4](examples/dancing-notes-sample.mp4)

1920 × 1080 · 30 fps · 约 10 秒 · 约 5.4 MB，含音轨。

示范视频由 **言说新事使用 AI 辅助创作**，封面由 **言说新事原创制作**。演示曲目为 **Bach — Prelude and Fugue in C major, BWV 846**；乐谱、MIDI、MusicXML 来源：[Scorebase #5956](https://scorebase.org/scores/5956)。音频可根据乐谱数据通过程序合成。发布包不包含源乐谱、MIDI、MusicXML 或独立音频素材。

该视频用于展示效果，不是新曲的运行素材。新曲需要重新生成时间、符头坐标与镜头路径；不能用示范视频代替曲谱或音频数据。

## 开始使用

将本仓库完整文件夹作为 `dancing-notes` Skill 添加到所用 Agent 支持的技能目录，按该工具的方式启用。安装时保留 `SKILL.md`、`assets/`、`scripts/` 和 `references/` 的相对位置；不要只复制 SKILL.md。`agents/openai.yaml` 是可选的界面元数据，核心工作流不依赖特定服务商。

官方仓库发布后，可用 [Skills CLI](https://skills.sh/docs/cli) 安装，并按提示选择 Agent：

```bash
npx skills add SyanChen7/dancing-notes
```

使用发布 ZIP 时先执行 `unzip dancing-notes.zip`，得到的 `dancing-notes/` 就是完整 Skill，根目录内含 `SKILL.md`。可让 Agent 直接阅读该文件，或将整个文件夹放入它支持的技能目录。

可以这样提出请求：

> 用 Dancing Notes 为《曲名》制作发光小球跳跃的曲谱动画。先检查我指定的素材文件夹，缺少资料时帮我查找下载，验证匹配后先给我短预览。

也可以直接让 Agent 阅读 [SKILL.md](SKILL.md) 并执行其中的流程。不同 Agent 的浏览、下载、工具调用和渲染能力不同，需要具备相应执行环境。

## 需要准备什么

**可以只提供曲名，不要求提前找齐所有文件。** 有现成曲谱或录音时，提供文件夹位置及想使用的版本更方便。

| 材料                            | 获取方式                    |
| ----------------------------- | ----------------------- |
| MusicXML / MXL 或 MuseScore 源谱 | 先检查本地；缺失时查找合适的免费来源      |
| MIDI                          | 复用匹配文件、获取同版本配套文件，或从源谱生成 |
| 音频                            | 复用已对齐录音，或从同一份谱合成        |
| 动画中的 SVG 曲谱                   | 由工具排版生成并提取真实符头坐标        |
| PDF / 图片                      | 可选，用于核对谱面；不是必需输入        |

本地缺少生成工具时先尝试可靠的同源配套下载；确需安装 MuseScore Studio 4 时，Agent 会说明缺项并确认安装。具体流程见 [资料查找](references/acquisition.md) 与 [素材和音频](references/materials-and-audio.md)。

## 内置内容

```text
dancing-notes/
├── SKILL.md
├── README.md
├── README.en.md
├── LICENSE
├── agents/openai.yaml
├── references/                 # 查找、校验、音频与制作说明
├── scripts/create_project.py   # 创建独立工作项目
├── assets/dancing-notes-starter/
│   ├── src/                    # 动画、镜头、运动与数据接口
│   ├── scripts/                # 制谱、符头测量、校验与渲染
│   └── package.json.template   # 创建项目时生成 package.json
└── examples/dancing-notes-sample.mp4
```

源码模板直接随 Skill 提供，没有内部 ZIP，也不引用作者电脑上的其他文件。

## 运行环境与开发

已验证环境：**macOS arm64、Node.js 22.18.0 / npm 10.9.3**。必要工具为 Python 3（内置解析脚本仅用标准库）、FFmpeg/FFprobe、支持 Remotion 的 Chromium 浏览器及 WebGL。模板固定 Remotion 4.0.518、React 19.2.3、Three.js 0.180.0、Verovio 6.3.0，通过 `npm install` 安装。尚未全面验证 Windows/Linux。

使用 Node.js/npm、Python 3、FFmpeg/FFprobe，以及可运行 Remotion 的浏览器/WebGL 环境。MuseScore 是按需要使用的转换与合成工具，不是 Skill 启动的强制安装项。

在 Skill 根目录执行以下命令，可将模板复制到一个尚不存在、且不位于其他 Node 项目内的工作目录：

```bash
python3 scripts/create_project.py ../my-dancing-notes-project
cd ../my-dancing-notes-project
npm install
npm test
npm run typecheck
```

随后进入工作项目，阅读其 README 并安装依赖。请勿在 Skill 的 assets 目录运行安装或制作。已有 Remotion 仓库按 SKILL.md 合并代码与依赖，不创建嵌套项目。

内置模板保留精确依赖版本；所有 Remotion 包需要保持同版本。Skill 本身不包含 node_modules、浏览器、音源库或用户歌曲素材。

## 能力边界与验证

默认模板面向钢琴双谱表与单张 SVG 纸面。多页、反复、装饰音、持续演奏跨行等情况，需要 Agent 完成适配和检查。它不是“任意音乐一键转谱”的自动识谱软件。

内置视觉来自已有动画项目。最终 ZIP 的 Skill 格式、相对路径、工作目录迁移和模板复制已检查；独立的 13 音符 MusicXML/MIDI 测例已通过解析、映射、渲染、音频同步和回归测试。空模板仍需生成自己的曲目数据后才能通过 `npm run validate` 和 `npm run render`；尚未以当前 Skill 从曲名开始跑完一首新曲的全流程。实际制作仍需验证音符映射、音画同步与完整成片。

## Author & Original Project · 原创作者与项目

**Dancing Notes** 是由 **言说新事** 原创制作的 Remotion 音乐可视化项目。

- **Creator：** 言说新事
- **Official GitHub：** [https://github.com/SyanChen7/dancing-notes](https://github.com/SyanChen7/dancing-notes)
- **Douyin：** [https://v.douyin.com/sJT9y3rtEjU/](https://v.douyin.com/sJT9y3rtEjU/)

**License：** MIT

欢迎在 MIT 许可下使用、修改和分享本项目。重新分发代码时，请保留原始版权与许可声明。

如果你使用本 Skill 创作作品，欢迎注明原创项目出处！

## 许可证

本项目原创代码、Skill 文档及内置代码模板采用 [MIT License](LICENSE)，版权署名为 **言说新事 (SyanChen7)**。

示范视频 `examples/dancing-notes-sample.mp4` 及其音乐、录音和曲谱内容，以及封面图片，不包含在上述 MIT 授权范围内，本项目未为这些媒体另行授予再利用许可。用户获取的曲谱、录音和音源遵循各自的授权条件。

Remotion、React、Three.js、Verovio 等第三方依赖遵循各自许可证；本项目的 MIT 许可不替代其条款。依赖通过包管理器安装，未打包进本仓库。
