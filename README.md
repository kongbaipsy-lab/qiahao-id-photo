# 恰好证件照

免费的浏览器证件照工具，无需注册或登录。

**在线使用：https://kongbaipsy-lab.github.io/qiahao-id-photo/**

## 功能

- 一寸、二寸、身份证、驾驶证等参考规格
- 自定义像素、毫米及 DPI，文件内写入分辨率
- 按比例裁剪、旋转、移动和缩放
- MODNet 精细人像抠图，白、蓝、红及自定义底色，边缘微调
- JPG/PNG 导出与 JPG 文件大小上限

## 隐私与运行

照片只在浏览器中处理。没有图片上传接口、用户账户、收费接口或第三方统计。首次抠图会从本站下载约 37 MB 的模型与运行组件；之后可使用浏览器缓存。建议使用最新版 Chrome、Edge、Safari。低性能手机处理可能较慢。

本地运行：在仓库目录执行 `python3 -m http.server 8080`，访问 `http://localhost:8080`。不要用 file:// 直接打开，因为模型和 Web Worker 需要 HTTP 服务。

GitHub Pages 从 main 分支根目录发布，`.nojekyll` 保留所有静态文件。

## 抠图说明

采用专用于人像透明度估计的 MODNet fp32 模型，替换低分辨率实时人像分割。使用独立 Worker，照片保持在本机。保留连续透明度而非二值切割；边缘微调不会改变脸部五官。复杂背景、透明衣物及原图过度压缩仍可能需要人工检查。规格仅为参考，不承诺审核通过，也不生成回执。

## 第三方组件

- MODNet：Apache 2.0，https://github.com/ZHKKKe/MODNet
- ONNX 权重：Xenova/modnet，https://huggingface.co/Xenova/modnet
- 权重 SHA-256：`07c308cf0fc7e6e8b2065a12ed7fc07e1de8febb7dc7839d7b7f15dd66584df9`
- ONNX Runtime Web 1.20.1：MIT，https://github.com/microsoft/onnxruntime

许可证随附于 `vendor/matting/`。
