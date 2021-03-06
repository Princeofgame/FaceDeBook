/* On importe les bibliothèques essentielles (Express pour l'API, Mysql pour la BDD, 
et Body-parser pour lire le body des requêtes http)*/
var express = require('express');
var mysql = require('mysql');
var bodyParser = require("body-parser");
var jwt = require('jsonwebtoken');
var config = require('./configurations/Config');

// On spécifie le port et l'url du serveur NodeJs
var hostname = 'localhost';
var port = 3000;

// On crée une application Express et un routeur Express
var app = express();
var myRouter = express.Router();

/* On attache le bodyparser à l'application, 
cela va permettre à l'application d'utiliser des fonctions permettant de lire les requêtes http facilement (en tant que JSON dans notre cas)*/
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('Secret', config.secret);

// On crée une interface d'authenfication 
app.post('/authenticate', (req, res) => {
	if (req.body.username === "CESI") {
		if (req.body.password === "A2 CESI EXIA") {			
			const payload = {
				check: true
			};
			
			var token = jwt.sign(payload, app.get('Secret'), {
				expiresIn: 1440 // expires in 24 hours	
			});
			
			res.json({
				message: 'authentication done ',
				token: token
			});
			
		} 
		else {
			res.json({ message: "please check your password !" })
		}
	} 
	else {
		res.json({ message: "user not found !" })
	}
});

// On prépare la connexion Mysql
var con = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "245136",
	database: "bde_nationale"
});

// On se connecte à la BDD
con.connect(function (err) {
	if (err) throw err;
	console.log("Successfully connected to the database.");
});

// Incorporer notre système d'authentification dans notre routeur
myRouter.use((req, res, next) =>{
	var token = req.headers['access-token'];

	if (token) {
		jwt.verify(token, app.get('Secret'), (err, decoded) =>{      
			if (err) {
				return res.json({ message: 'invalid token' });    
			} else {
				req.decoded = decoded;    
				next();
			}
		});
	} 
	else { 
		res.send({ 
			message: 'No token provided.' 
		});
	}
});

// On specifie quelle URI va enclencher l'API pour les requêtes GET et DELETE
myRouter.route('/visiteurs')
.get(function (req, res) {
	if (typeof req.query.email !== 'undefined'){
		if (req.query.password) {
			con.query("SELECT * FROM visiteurs WHERE Email = ? AND Password = ?", [req.query.email, req.query.password], function (err, result, fields) {
				if (err) throw err;
				res.send(result);
			});
		}
		else {
			con.query("SELECT * FROM visiteurs WHERE Email = ?", req.query.email, function (err, result, fields) {
				if (err) throw err;
				res.send(result);
			});
		}
	}
	else{
		res.send('');
	}
})
.delete(function (req, res) {
	con.query("DELETE FROM visiteurs WHERE id_visiteur = ?", req.query.id_visiteur, function (err, result, fields) {
		if (err) throw err;
		res.send(result);
	});
});

// On specifie quelle URI va enclencher l'API pour les requêtes PUT ET POST
myRouter.route('/visiteurs')
.post(function (req, res) {
	con.query("INSERT INTO visiteurs (Nom, prenom, email, password, id_centre, access, Avatar) VALUES (?,?,?,?,?,?,null)",
	[req.body.Nom, req.body.Prenom, req.body.Email, req.body.Password, req.body.Id_centre, req.body.Access],
	
	function (err, result, fields) {
		if (err) throw err;
		res.send(result);
	});
})
.put(function (req, res) {
	// Set = un tableau contenant les différents attributs à modifier (SET attr = valeur)
	var set = [];
	
	/*On crée une boucle qui prend en paramètre f les clés de l'objet json req.body 
	dans laquelle on remplira le tableau set des couples clé = valeur */
	for (var f in req.body) {
		if (f == "id_visiteur") {
			break;
		}
		set.push(f + " = '" + req.body[f] + "'");
	}
	
	// On relie ces couples avec une virgule
	var sql = set.join(", ");
	
	con.query("UPDATE visiteurs SET " + sql + " WHERE id_visiteur = ?",
	[req.body.id_visiteur], function (err, result, fields) {
		if (err) throw err;
		res.send(result);
	});
});

// On spécifie à l'application d'utiliser le routeur qu'on vient de créer 
app.use(myRouter);

// On lance le serveur EXPRESS
app.listen(port, hostname, function () {
	console.log("URL http://" + hostname + ":" + port);
});
