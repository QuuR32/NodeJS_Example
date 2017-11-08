const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { check, validationResult } = require('express-validator/check');
const mysql = require('mysql');

const app = express();
const port = 3000;

const cnxString = require('./cnx.json');

// Connection to the database
const con = mysql.createConnection(cnxString);
const news = new Array;

/*
const logger = (req, res, next) => {
	console.log('Logging...');
	next();
}

app.use(logger);
*/

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// Set static path (Used to create a static folder to give to the client, where all the client side files should be put)
app.use(express.static(path.join(__dirname, 'public')));

// Global vars
app.use((req, res, next) => {
	res.locals.errors = null;
	next();
});
app.use((req, res, next) => {
	res.locals.newNews = {
		ID: -1,
		Titre: null,
		Contenu : null
	};
	next();
});

con.connect((err) => {
	if (err) throw err;
	console.log("Connected!");
	con.query("SELECT * FROM news", function (err, result, fields) {
		if (err) throw err;
		for(let i = 0; i < result.length; i++) {
			news.push(result[i]);
		}
	});
});

app.get('/', (req, res) => {
	res.render('index', {
		title: 'News application',
		news: news
	});
});

app.get('/news/displayAdd', (req, res) => {
	res.redirect('/');
});

app.post('/news/add', [
	check('Titre').isLength({ min: 1 }).withMessage("cannot be empty"),
	check('Contenu').isLength({ min: 1 }).withMessage("cannot be empty")
], (req, res, next) => {
	const errors = validationResult(req);

	entryNews = {
		ID: req.body.ID,
		Titre: req.body.Titre,
		Contenu : req.body.Contenu
	};

	if (!errors.isEmpty()) {
		res.render('index', {
			title: "Errors in the form",
			news: news,
			newNews: entryNews,
			errors: errors.mapped()
		});
	} else {
		if (entryNews.ID == -1) {
			var sql = "INSERT INTO news (Titre, Contenu) VALUES ('" + entryNews.Titre + "', '" + entryNews.Contenu + "')";
		  con.query(sql, function (err, result) {
		    if (err) throw err;
		    entryNews.ID = result.insertId;
				news.push(entryNews);
				res.redirect('/');
		  });
		} else {
			var sql = "UPDATE news SET Titre = '" + entryNews.Titre + "', Contenu = '" + entryNews.Contenu + "' WHERE ID = " + entryNews.ID;
		  con.query(sql, function (err, result) {
		    if (err) throw err;
		    for(let i = 0; i < news.length; i++) {
					if (news[i].ID == entryNews.ID) {
						news[i] = entryNews;
					}
				}
				res.redirect('/');
		  });
		}
	}
});

app.get('/news/update', (req, res, next) => {
	res.render('index', {
		title: 'Updating news',
		news: news,
		newNews: news[req.query.index]
	});
});

app.get('/news/delete', (req, res, next) => {
	var sql = "DELETE FROM news WHERE ID = " + req.query.id;
	con.query(sql, function (err, result) {
		if (err) throw err;
		for (var i = news.length - 1; i >= 0; --i) {
		    if (news[i].ID == req.query.id) {
		    		news.splice(i, 1);
		    }
		}
		res.redirect('/');
	});

});

app.listen(port, () => {
	console.log('server started on port ' + port)
});
