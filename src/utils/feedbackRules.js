import { getTool } from '../data/tools';

export function createFeedback(toolId, nextElements, analysis) {
  if (toolId === 'wind' && nextElements.wind >= 3 && analysis.speed > 0.5) {
    return '风已经很明显了。你想不想给它加一点草，让它慢一点？';
  }
  if (toolId === 'rain' && nextElements.rain >= 2) {
    return '雨已经让土地变得柔软。也许有一颗小草准备冒出来了。';
  }
  if (toolId === 'grass' && nextElements.grass >= 2) {
    return '绿色一点点长出来了。它可以继续慢慢长，也可以等一束阳光。';
  }
  if (toolId === 'flower' && nextElements.flower >= 2) {
    return '花开了几处。每一朵都可以只打开到它舒服的位置。';
  }
  if (toolId === 'sun' && nextElements.sun >= 2) {
    return '光变得更暖了。花园被轻轻照着，不需要再更用力。';
  }
  if (analysis.direction === 'vertical' && toolId === 'rain') {
    return '雨线轻轻落下来，花园听见了这一点声音。';
  }
  if (analysis.direction === 'circular' && toolId === 'flower') {
    return '圆圆的线像花瓣慢慢打开，花园多了一点颜色。';
  }
  return getTool(toolId).feedback;
}
