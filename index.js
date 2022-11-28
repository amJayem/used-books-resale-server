const express = require('express');
require('dotenv').config();
const port = process.env.PORT || 5000;
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const booksCollection = client.db('bookshop').collection('books');
        const advertiseCollection = client.db('bookshop').collection('advertise');
        const categoriesCollection = client.db('bookshop').collection('categories');
        const buyerOrdersCollection = client.db('bookshop').collection('buyerOrders');

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

        
        // delete user by admin
        app.delete('/delete/user/:id', async(req, res) =>{
            const id = req.params.id;
            // console.log(id);
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);

            res.send(result);
        })

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

        // storing books by seller 
        app.post('/books', async(req, res)=>{
            const book = req.body;
            const result = await booksCollection.insertOne(book);

            res.send(result);
        });

        // getting all book info by each seller
        app.get('/books', async(req, res)=>{
            const email = req.query.email;
            const query = { addedBy: email};
            const result = await booksCollection.find(query).toArray();

            res.send(result);
        });

        // seller can delete their book from list by id
        app.delete('/books/:id', async(req,res) =>{
            const id = req.params.id;
            const query = { _id: ObjectId(id)}
            const result = await booksCollection.deleteOne(query);

            res.send(result);
        });

        // seller can update their product status
        app.patch('/book/status/:id', async(req,res)=>{
            const id = req.params.id;
            const status = req.body;
            const filter = { _id: ObjectId(id)}
            const options = { upsert: true}
            const updatedDoc={
                $set:  status,
            }
            const result = await booksCollection.updateOne(filter , updatedDoc);

            res.send(result);
        });

        // seller can add their product for advertising
        app.patch('/book/feature/:id', async(req,res)=>{
            const id = req.params.id;
            // const advertise = req.body;
            const filter = { _id: ObjectId(id)}
            const options = { upsert: true}
            const updatedDoc={
                $set:  {advertise: true},
            }
            const result = await booksCollection.updateOne(filter , updatedDoc);

            res.send(result);
        });

        // seller can remove their product for advertising
        app.patch('/book/feature/remove/:id', async(req,res)=>{
            const id = req.params.id;
            // const advertise = req.body;
            const filter = { _id: ObjectId(id)}
            const options = { upsert: true}
            const updatedDoc={
                $set:  {advertise: false},
            }
            const result = await booksCollection.updateOne(filter , updatedDoc);

            res.send(result);
        });

        // getting all books and will be filtering for advertisement show
        app.get('/feature/books', async(req, res)=>{
            
            const result = await booksCollection.find({advertise: true, status: 'available'}).toArray();
            res.send(result);
        });

        // getting categories
        app.get('/categories', async(req, res)=>{
            const result = await categoriesCollection.find({}).toArray();

            res.send(result);
        })

        // getting category by id
        app.get('/category/:id', async(req, res)=>{
            const id = req.params.id;
            const query = { categoryId: id};
            const result = await categoriesCollection.findOne(query);

            res.send(result);
        });

        // getting books by category id
        app.get('/books/categoryId', async (req, res) => {
            const id = req.query.id;
            const query = { categoryId: id};
            const result = await booksCollection.find(query).toArray();

            res.send(result);
        })
        
        // fetching book info for booking a book by buyer
        app.get('/book/:id', async(req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id)};
            const result = await booksCollection.findOne(filter);

            res.send(result);
        })

        // tracking buyers orders
        app.post('/buyer-orders', async (req, res) =>{
            const book = req.body;
            const result = await buyerOrdersCollection.insertOne(book);

            res.send(result);
        })

        // getting all book orders info by each buyer
        app.get('/buyer-orders', async(req, res)=>{
            const email = req.query.email;
            const query = { buyerEmail: email};
            const result = await buyerOrdersCollection.find(query).toArray();

            res.send(result);
        });

        // getting buyer order info for payment
        app.get('/buyer-orders/:id', async(req, res)=>{
            const id = req.params.id;
            const filter = { _id: ObjectId(id)};
            const result = await buyerOrdersCollection.findOne(filter);

            res.send(result);
        });

        //  buyer make payment && updated buyer order
        app.patch('/buyer-orders/success/:id', async(req,res)=>{
            const id = req.params.id;
            // const advertise = req.body;
            const filter = { _id: ObjectId(id)}
            const options = { upsert: true}
            const updatedDoc={
                $set:  {payment: true},
            }
            const result = await buyerOrdersCollection.updateOne(filter , updatedDoc);

            res.send(result);
        });

        // getting all buyer
        app.get('/all-buyers', async(req, res)=>{
            const result = await usersCollection.find({ role: 'buyer'}).toArray();

            res.send(result);
        });

        // getting all sellers
        app.get('/all-sellers', async(req, res)=>{
            const result = await usersCollection.find({ role: 'seller'}).toArray();

            res.send(result);
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