const express = require('express');
     const apiRouter = require('./api');
     const app = express();

     app.use(express.json());
     app.use('/api', apiRouter);

     app.listen(process.env.PORT || 3000, () => {
       console.log('Server running on port', process.env.PORT || 3000);
     });
