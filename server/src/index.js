import app from './app.js';

const port = Number(process.env.STORY_SCENE_API_PORT || 3008);

app.listen(port, () => {
  console.log(`Story scene API listening on http://127.0.0.1:${port}`);
});
