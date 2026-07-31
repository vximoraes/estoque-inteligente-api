import 'dotenv/config';
import { bootstrap } from './src/app.js';

const port = process.env.PORT || 5000;

const app = await bootstrap();

app.listen(port, () => {
  console.log(`Servidor escutando em http://localhost:${port}`);
});
