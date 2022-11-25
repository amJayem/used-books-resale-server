const express = require('express');
require('dotenv').config();
const port = process.env.PORT || 5000;
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');

const app = express();
// middle wares
app.use(cors());
app.use(express.json());

// verify jwt
function verifyJWT(req,res,next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send(`Unauthorized access`);
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token,process.env.TOKEN, function(err, decoded){
        if(err){
            return res.status(403).send({message: 'forbidden access'})
        }
        req.decoded = decoded;
        next();
    })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.42e2srw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const usersCollection = client.db('bookshop').collection('users');

        // storing user info to db when a user signup 
        app.post('/users', async (req, res) =>{
            const user = req.body;
            const result = await usersCollection.insertOne(user);

            res.send(result);
        });

        // getting user info from db by email
        app.get('/user', async(req, res) =>{
            const email = req.query.email;
            const query = { email: email}
            const result = await usersCollection.findOne(query);

            res.send(result);
        });

        // verify jwt by user email
        app.get('/jwt', async(req,res) => {
            const email = req.query.email;
            const query = {email: email};
            const user = await usersCollection.findOne(query);

            if(user){
                const token = jwt.sign({email}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1d'});
                return res.send({accessToken: token});
            }

            return res.status(403).send({accessToken: 'forbidden'});
        });
    }
    finally{}
}

run().catch(e=>{
    console.error('run error => ',e.message);
})


app.get('/', (req, res)=>{
    res.send('BOOKSHOP server is running');
});

app.listen(port, ()=>{
    console.log('server running on: ', port);
})