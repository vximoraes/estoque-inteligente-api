import fs from 'fs';
import readline from 'readline';

export default async function getFirstLine(
  pathToFile: string,
): Promise<string> {
  const readable = fs.createReadStream(pathToFile);
  const reader = readline.createInterface({ input: readable });
  const line = await new Promise<string>((resolve) => {
    reader.on('line', (line) => {
      reader.close();
      resolve(line);
    });
  });
  readable.close();
  return line;
}
