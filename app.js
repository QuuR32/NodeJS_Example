const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { check, validationResult } = require('express-validator/check');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const assert = require('assert');

const app = express();
const port = 3000;

var uri = "mongodb://localhost:27017/test?authSource=admin";

// Connection to the database
const news = new Array;

var fillNews = (callback) => {
	news.length = 0;
	MongoClient.connect(uri, (err, db) => {
		assert.equal(null, err);
		var cursor = db.collection('news').find();
		cursor.each((err, doc) => {
			assert.equal(err, null);
			if (doc != null) {
				news.push(doc);
			}
		});
		if (callback) callback();
		db.close();
	});
};

var insertNews = (document, callback) => {
	MongoClient.connect(uri, (err, db) => {
		assert.equal(null, err);
		db.collection('news').insertOne(document, (err, result) => {
			assert.equal(err, null);
			if (callback) callback(result.insertedId);
  	});
		db.close();
	});
};

var updateNews = (document, callback) => {
	MongoClient.connect(uri, (err, db) => {
		assert.equal(null, err);
		db.collection('news').updateOne(
			{ _id: new mongodb.ObjectID(document._id) },
			{
				$set: {
					"Titre": document.Titre,
					"Contenu": document.Contenu
				}
			}, (err, results) => {
			if (callback) callback();
			db.close();
		});
	});
};

var removeNews = (id, callback) => {
	MongoClient.connect(uri, (err, db) => {
		assert.equal(null, err);
		db.collection('news').deleteOne({ _id: new mongodb.ObjectID(id) }, (err, results) => {
			console.log(results);
			assert.equal(null, err);
			fillNews();
      if (callback) callback();
    });
		db.close();
	});
};

fillNews();

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
		_id: -1,
		Titre: null,
		Contenu : null
	};
	next();
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
		_id: req.body._id,
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
		if (entryNews._id == -1) {
			document = {
				"Titre" : entryNews.Titre,
				"Contenu" : entryNews.Contenu
			};
			insertNews(document, (insertedId) => {
		    entryNews._id = insertedId;
				news.push(entryNews);
				res.redirect('/');
			});
		} else {
			updateNews(entryNews, () => {
				for(let i = 0; i < news.length; i++) {
					if (news[i]._id == entryNews._id) {
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
	removeNews(req.query.id, () => {
			for (var i = news.length - 1; i >= 0; --i) {
			    if (news[i]._id == req.query.id) {
			    		news.splice(i, 1);
			    }
			}
			res.redirect('/');
	});
});

app.listen(port, () => {
	console.log('server started on port ' + port)
});
