---
name: dancing-notes
license: MIT
metadata:
  author: "言说新事 (SyanChen7)"
  repository: "https://github.com/SyanChen7/dancing-notes"
  douyin: "https://v.douyin.com/sJT9y3rtEjU/"
  version: "1.0.2"
description: 根据曲名或已有乐谱制作发光小球随音乐沿符头跳跃的 3D 曲谱动画，也用于此类动画的换曲与修改。
---

# Dancing Notes · 跳跃的音符

内置源码模板位于 [assets/dancing-notes-starter/](assets/dancing-notes-starter/README.md)，随 Skill 一起分发。复用其中的球体、光环、轨迹、纸面彩光、景深与镜头；按新曲生成数据。效果示范见 [examples/dancing-notes-sample.mp4](examples/dancing-notes-sample.mp4)，仅用于理解视觉，不作为新曲的谱面或音轨。

## 从曲名或已有资料开始

用户只提供曲名即可启动，不要求用户预先提交MusicXML/MXL。先读 [查找、下载与匹配](references/acquisition.md)，检查用户指定文件夹内已有材料，再补缺；仅曲名且未指定目录时使用当前任务工作区。不要扫描无关目录或把缺素材直接推回用户。

1. 核实曲名、作曲者和目标编制。只在同名歧义、多个实质不同版本或用户指定演奏无法判断时询问。
2. 已有MusicXML/MXL或MuseScore源谱：将其作为候选基准，检查MIDI、音频及参考谱面是否与其对应，不以同名认定匹配。PDF不是必需项，最终SVG可本地生成。
3. 没有可用结构化源谱：根据曲名主动在线查找并下载，优先免费、来源清楚且适合目标编制的版本。先找MusicXML/MXL，也接受可转换的MSCZ/MSCX。搜索和正常下载属于本工作流，不逐个文件请求确认；保留原始文件与来源。
4. 缺少MIDI/音频时，按 [素材与音频](references/materials-and-audio.md) 选择补齐方式：已有工具从同一份谱生成；无工具时先查同版本配套下载；仍不可用时说明缺项，确认安装MuseScore Studio 4后生成。用户已授权安装则不重复询问。
5. 只有MIDI时可整理为双谱表，但先找合适源谱；只有PDF/图片/录音时先找结构化谱，不立即要求用户自行转录。搜不到时如实报告并给出识谱/转录校对等后续选项，不捏造下载结果。

确认曲目范围、需显示的声部以及是否必须保留原录音。缺省复用1920×1080、30fps、5帧入场；时长按曲目计算。素材匹配后持续制作，不逐阶段重复确认。

## 建立制作项目

先读目标项目约定。Skill目录只保存可复用资源，用户曲目和输出写入工作项目。

**独立项目**：用 `python3 <此Skill目录>/scripts/create_project.py <新的项目目录>` 创建工作副本，再阅读项目内 `README.md` 和 `docs/换曲说明.md`。该工具仅用Python标准库，复制模板并将 `package.json.template` 生成为工作项目的 `package.json`，不安装软件。安装模板锁定依赖；Remotion与所有@remotion包保持同一版本，不附带升级。

**已有Remotion仓库**：不要运行独立项目创建脚本，不覆盖package.json或再次registerRoot。直接读取内置模板，将需要的src与scripts适配到用户指定效果目录；依赖合并到仓库根级，素材放到该效果命名空间。把模板staticFile路径、校验脚本与渲染入口一并适配；遵守现有Composition ID、尺寸、时长和输出约定。不要留下子package.json、lock或node_modules。

先查已有Node/npm、Python、FFmpeg/FFprobe；只在缺少合成音轨或曲谱转换能力时考虑MuseScore。已经有正确SVG、数据与音轨时不必安装MuseScore。安装必须符合用户授权和当前环境权限，不暗中重置软件配置。

## 制作与验证

读取 [制作流水线](references/production.md)，按顺序完成：

1. 从一致的曲谱/演奏版本得到MXL、MIDI与音轨；保留原始材料。
2. 给MusicXML音符建立稳定ID，用Verovio生成SVG，从真实notehead几何获取坐标。
3. 根据节拍、音高、voice与实际演奏顺序生成events/activations；单独处理和弦、反复、tie和装饰音。无法匹配时报告并解决，不删掉事件来让校验通过。
4. 生成镜头路径及JSON，放置最终SVG和音轨。换排版必须重新获取坐标。
5. 类型与结构校验；查看入场、落点、和弦、换行和结尾关键帧及短预览，再按用户要求输出完整成片。
6. 导出时完整检查画面与音频，交付成片、可复用项目以及映射/同步检查结果。仅要求预览时不擅自做昂贵的完整导出。

## 保持的动画逻辑

- 落地后直接开始下一跳，重复同一位置也跳；每个实际起音有独立ring，每个staff只有一个主球。
- 位置来自符头几何，时间来自MIDI；同一和弦的所有音符都保留反馈。
- 音频与事件仅统一增加一次入场偏移。固定偏移不能修复渐进漂移。
- 小球贴身光晕克制，纸面彩光宽；保留真实3D近镜头与原实现的光照/后期。
- 由帧时间确定动画，不用Date.now或Math.random驱动运动。
- 模板将system变化视为休止。跨行持续演奏时必须适配该分支并验证，不能把连续音符淡出掉。

模板是双谱表、一张SVG纸面的视觉起点，不是自动转录、任意乐曲对齐或翻页软件。技能不依赖作者机器、其他Skill或原项目的曲谱/音源。
