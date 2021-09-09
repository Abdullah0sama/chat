const express   = require('express');
const path      = require('path');
const http      = require('http');

const app       = express();
const PORT      = process.env.PORT || 3000;








app.get('/', (req, res) => {
    res.send('Hello');
})





app.listen(PORT, () => {
    console.log('Server has started at port ' + PORT);
})
