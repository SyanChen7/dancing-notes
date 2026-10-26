# 制作流水线与验收

## 1. 工作区与输入

先完成 [查找、下载与匹配](acquisition.md)，不要求用户自行找齐MusicXML与配套材料。只有“文件存在”而尚未验证匹配，不能视为前置检查完成。

先读取创建后的工作项目README、docs/换曲说明.md、src/types.ts及src/performance.ts。完整保留用户原始材料；不要把曲目、音轨、测试输出写回Skill。独立模板普通产物在output/，已有仓库遵守其效果目录与renders约定。

现有read-music.py仅支持MXL容器中的单一piano part及PPQ计时SMF 0/1。收到未压缩MusicXML先用MuseScore导为MXL，或明确适配解析器；不能仅改扩展名。多part先明确显示声部与伴奏保留策略，不静默丢弃音符。选定片段要统一平移事件、镜头和音频时间；末音尾响可纳入musicDuration。

## 2. 制谱与符头

以下命令从独立项目根目录执行，input中的名称由真实材料替换：

```bash
python3 scripts/read-music.py input/score.mxl input/performance.mid output/analysis
node scripts/engrave.mjs output/analysis/identified.musicxml output/engraved
node scripts/note-geometry.mjs output/engraved/page-1.svg output/geometry.json
```

engrave导出全部页面。单页范围将对应SVG复制到public/score/score.svg；多页整曲需拼接并变换全部坐标后再测量，或明确实现翻页。拼接时处理重复SVG ID、defs和viewBox。不得只用第一页却声称完成整曲。纸面过大时检查纹理/GPU限制。

geometry的notes键是实际SVG中g.note的ID，值是notehead中心；与identified.musicxml核对ID是否保留。不得用default-x、截图像素或等间距点替代最终SVG几何。

## 3. 事件映射是必须完成的制作工作

read-music仅解析，不自动映射。根据实际曲目编写映射脚本，保存到工作项目以便重建。

- 利用节拍、音高、voice/staff与小节演奏顺序匹配；反复、跳房、D.C./D.S.等需展开播放顺序。小节内beat不能直接当整首实际播放时间。
- MIDI全部track/channel正力度起音逐一计数；检查解析器报告的unclosed及异常配对，不掩盖缺失note-off。
- events保留实际起音，activations包含起音及必要tie延续视觉。每项eventId唯一，sustain不伪造新声音；演奏反复可复用同一scoreId但必须有不同eventId。
- 和弦全部映射；装饰音按MIDI实际时间展开。同音高并发不能总取第一个符头。
- 明确每个音的staff 1/2和system索引；MIDI track/channel不等于谱表。
- 超出支持范围时适配并验证，或具体说明缺口。严禁漏掉未匹配事件以凑成通过结果。

写入src/score-data.json，字段与单位以src/types.ts及docs/换曲说明.md为准。public相对路径不带public/前缀；相对URL用正斜杠。模板已有占位JSON，不能把其空数组当成成品。

提供逐声部的原始MIDI起音数、所选范围起音数、映射数、未匹配/重复/歧义数，以及tie、装饰音、反复处理记录。未匹配数为0只是必要条件，还需抽查落点是否正确。

## 4. 镜头与运动

camera键按时间严格递增，x/y是SVG坐标；让当前上下声部均可见。为每次换行设计过渡。审查performance.ts中resting逻辑：模板system变化会触发淡出入场，不适用于无休止跨行；此时要适配并检查持续演奏。保留其他已验证的核心运动与光照，避免重做视觉。

运行npm run typecheck和npm run validate。validate只验结构及文件存在，不证明音乐正确，也不核实素材真实格式。

## 5. 预览与导出

独立项目用npm run studio预览。先看第一音前后、重复音、和弦、延音、跨行与末尾关键帧，做短段低清预览。正式渲染用npm run render；该脚本输出无音轨画面后用FFmpeg加一次入场延迟，结果在output/music-score.mp4。

render脚本默认封装整曲。不能只给它追加--frames导出中间片段却沿用完整音频；短片需独立正确裁切音频并处理时间原点，或临时在工作副本中裁切数据。不要改Skill内模板用于临时预览。

环境需可用浏览器和WebGL；按实际平台排查，不盲目套用某个GL后端。记录失败原因和替代验证，不能把未运行的渲染写成通过。

## 6. 验收

- 画面：完整成片检查，球与真实符头对齐，连续跳跃无停顿，所有和弦有反馈，无跨行漏音、裁切或空白帧。
- 音频：FFprobe验证音轨、时长；检查首段、中段与末段多个起音的固定偏移与漂移，统计峰值/削波并实际试听。避免重复加5帧静音。
- 确定性：不要增加时钟或随机驱动；涉及随机/运动模糊修改时复渲染同帧比较。
- 交付：最终视频或预览、曲目数据与生成脚本、素材路径、Composition信息、重建/渲染命令以及未解决限制。不要在新项目里引用作者本地路径。
