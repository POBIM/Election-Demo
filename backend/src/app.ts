import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import errorHandler from './middleware/errorHandler.js';
import routes from './routes/index.js';

const app = express();

app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use(routes);

app.use(errorHandler);

export default app;
