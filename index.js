import express from 'express';
import pg from 'pg';
import bodyParser from 'body-parser';
import axios from 'axios';

const app = express();
const port = 3000;

const db = new pg.Client({
    user:"postgres",
    password:"1234",
    host:"localhost",
    database:"bookcase",
    port:5432
});

db.connect();

// Middleware
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static('public'));

async function getBooks() {
    const result = await db.query(
        "SELECT * FROM books");
    return result.rows;
}

async function bookCheck(id) {
    const result = await db.query(
        "SELECT * FROM books WHERE id = $1",[id]);
    return result.rows;
}

async function isbnControl(isbn) {
    const result = await db.query(
        "SELECT id,isbn FROM books WHERE isbn = $1",[isbn]);
    return result.rows;
}

async function addBook(title, author, isbn, date_read, review, rate) {
    await db.query("INSERT INTO books (title, author, isbn, date_read, review, rate) VALUES ($1, $2, $3, $4, $5, $6)",[title, author, isbn, date_read, review, rate]);
}

async function editBook(id, title, author, isbn, date_read, review, rate ) {
    await db.query(
        "UPDATE books SET title = $2 , author = $3 , isbn = $4 , date_read = $5 , review = $6 , rate = $7 WHERE id = $1",[id, title, author, isbn, date_read, review, rate]);
}

async function deleteBook(id) {
    await db.query(
        "DELETE FROM books WHERE id = $1",[id]);
}

app.get('/', async(req,res) => {
    try {
        const books = await getBooks();
        if (!books || books.length === 0) {
            return res.render("index.ejs", { books: [] });
        }

        for(let book of books){

            // ISBN yoksa devam et
            if(!book.isbn){
                book.cover = null;
                continue;
            }

            // Kapak URL'sini oluştur
            const coverUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg`;

            try {
                await axios.head(coverUrl); // kapak var mı kontrol
                book.cover = coverUrl;
            } catch (error) {
                book.cover = null;
            }
        }

        return res.render("index.ejs", { books });

    } catch (error) {
        console.log(error);
        return res.render("index.ejs", { books: [] });
    }
});


app.get("/add", async(req,res) => {
    return res.render("add.ejs");
});

app.post("/add", async(req,res) => {
    const title = req.body.title;
    const author = req.body.author;
    const isbn = req.body.isbn;
    const date_read = req.body.date_read;
    const review = req.body.review;
    const rate = req.body.rate;
    const isbnCheck = await isbnControl(isbn);
    if(isbnCheck.length > 0){
        return res.redirect("/add");
    }
    if(!title || !author || !isbn || !date_read || !review || !rate){
        return res.redirect("/add");
    }
    await addBook(title, author, isbn, date_read, review, rate); 
    return res.redirect("/");
});

app.get("/edit/:id", async(req,res) => {
    const id = parseInt(req.params.id);
    const book = await bookCheck(id);
    if(!book.length ){
        return res.redirect("/");
    }
    return res.render("edit.ejs",{book:book[0]});
});

app.post("/edit/:id", async(req,res) => {
    const id = parseInt(req.params.id);
    const title = req.body.title;
    const author = req.body.author;
    const isbn = req.body.isbn;
    const date_read = req.body.date_read;
    const review = req.body.review;
    const rate = req.body.rate;
    const isbnCheck = await isbnControl(isbn);
    if(!title || !author || !isbn || !date_read || !review || !rate){
        const book = await bookCheck(id);
        return res.render("edit.ejs",{book:book[0]});
    }
    if(isbnCheck.length > 0 && isbnCheck[0].id != id){
        const book = await bookCheck(id);
        return res.render("edit.ejs",{book:book[0]});
    }
    await editBook(id, title, author, isbn, date_read, review, rate);
    return res.redirect("/");
});

app.get("/delete/:id", async(req,res) => {
    const id = parseInt(req.params.id);
    const book = await bookCheck(id);
    if(!book.length ){
        return res.redirect("/");
    }
    return res.render("delete.ejs",{book:book[0]});
});

app.post("/delete/:id", async(req,res) => {
    const id = req.params.id;
    await deleteBook(id);
    return res.redirect("/");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});