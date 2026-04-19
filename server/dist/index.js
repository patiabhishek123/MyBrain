import express from 'express';
const app = express();
app.get('/', (req, res) => {
    res.json("Welcome to MyBrain");
});
app.listen(5000);
console.log("5000");
//# sourceMappingURL=index.js.map