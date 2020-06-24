if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const express = require("express")
const app = express()
const bcrypt = require("bcrypt")
const passport = require("passport")
const flash = require("express-flash")
const session = require("express-session")
const methodOverride = require("method-override")
const { Client } = require('pg')
const bodyParser = require('body-parser')
const url = require('url')
const querystring = require('querystring')

const connectionString = 'postgres://postgres@localhost:5432/database'

let user
let rows
let account

const client = new Client({
  host: 'localhost',
  user: 'postgres',
  port: 5432,
  database: 'compliance',
  password: '11818Baby'
})

const CODE_POSSIBILITIES = 10000000

client.connect()

function setRows(user) {
  sqlquery = "SELECT * FROM compliance_row WHERE account = $1 ORDER BY spot ASC"
  value = [user.account]
  client
    .query(sqlquery, value)
    .then( res => {
      rows = res.rows
    })
    .catch(e => {
      console.error(e.stack)
    })
}

async function makeUser(code, name, email, hashedPassword, response){

      const codeQuery = "SELECT id FROM account WHERE code = $1"
      const accountValue = [code]
      client
        .query(codeQuery, accountValue)
        .then( res => {
          account = res.rows[0].id
          console.log("account = " + account)


              console.log("name = " + name);
              const text = 'INSERT INTO worker (name, email, password, account) VALUES ($1, $2, $3, $4)'
              const values = [name, email, hashedPassword, account]
              client
                .query(text, values)
                .then(res => {
                  response.redirect('/login')
                })

        })
        .catch(e => {
          console.error(e.stack)
          response.redirect('/register')
        })
}

async function makeAccount(code, name, email, hashedPassword, response){
  console.log('I am about to make an account');
  console.log('code = ' + code);
  const accountText = 'INSERT INTO account (code) VALUES ($1)'
  const accountValue = [code]
  client
    .query(accountText, accountValue)
    .then( res => {
      const codeQuery = "SELECT id FROM account WHERE code = $1"
      client
        .query(codeQuery, accountValue)
        .then( res => {
          account = res.rows[0].id
          console.log("account = " + account)

          // now we need to make rows for the new account
          // First we get all the template rows
          const template = "SELECT * FROM compliance_row WHERE account = 1"
          client
            .query(template)
            .then(res => {
              var x = 0;
              console.log("res = " + res)
              console.log("res.rows = " + res.rows);
              console.log("res.rows.length = " + res.rows.length);
              console.log("res.rows[" + x + "] = " + res.rows[x]);
              while(x < res.rows.length) {
                owner = res.rows[x].owner
                if(owner == 'Admin')
                {
                  owner = name
                }
                const query = 'INSERT INTO compliance_row (control, policy_name, policy_location, policy_link, procedure_name, procedure_location, procedure_link, evidence_type, evidence_location, evidence_link, freq,	last_done,	next_to_do,	how_to_comply, owner,	criteria, results, last_assessed,	last_reviewed, next_review, legal_requirements, account, spot, is_header) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)'
                const in_values = [res.rows[x].control, res.rows[x].policy_name, res.rows[x].policy_location, res.rows[x].policy_link, res.rows[x].procedure_name, res.rows[x].procedure_location, res.rows[x].procedure_link, res.rows[x].evidence_type, res.rows[x].evidence_location, res.rows[x].evidence_link, res.rows[x].freq,	res.rows[x].last_done,	res.rows[x].next_to_do,	res.rows[x].how_to_comply, owner,	res.rows[x].criteria, res.rows[x].results, res.rows[x].last_assessed,	res.rows[x].last_reviewed, res.rows[x].next_review, res.rows[x].legal_requirements, account, res.rows[x].spot, res.rows[x].is_header]
                client
                  .query(query, in_values)
                  .then( res => {
                    console.log(res.rows[x])
                  })
                  .catch(e => {
                    console.error(e.stack)
                    response.redirect('/register')
                  })
                x++
              }
              console.log("name = " + name);
              const text = 'INSERT INTO worker (name, email, password, account) VALUES ($1, $2, $3, $4)'
              const values = [name, email, hashedPassword, account]
              client
                .query(text, values)
                .then(res => {
                  response.redirect('/login')
                })
            })
            .catch(e => {
              console.error(e.stack)
              response.redirect('/register')
            })
        })
        .catch(e => {
          console.error(e.stack)
          response.redirect('/register')
        })
    })
    .catch(e => {
      console.error(e.stack)
      response.redirect('/register')
    })
}


function getCode() {
  return Math.random().toString(36).substring(2,15) + Math.random().toString(36).substring(2, 15);
  const codeQuery = "SELECT id FROM account WHERE code = $1"
  console.log("code = " + code);
  const codeValue = [code]
  console.log('about to call client')
/*    client.query(codeQuery, codeValue, function (err, result){
    console.log(result);
  })*/
  client.query(codeQuery, codeValue)
    .then( async resQuery => {
      console.log('in res')
      console.log('resQuery = ' + resQuery.toString())
     if(resQuery == null || resQuery.rows == null || resQuery.rows[0] == null || resQuery.rows[0].id == null)
//      if(resQuery.rows[0].cnt == 0)
      {
        console.log('in null check')
        console.log('returning ' + code);
        return code
      }
      else
      {
        return await getCode()
      }
    })
    .catch(e => {
      console.error(e.stack)
    })
}

const initializePassport = require('./passport-config')
initializePassport(
  passport,
  //email => users.find(user => user.email === email),
  //id => users.find(user => user.id === id),
  async function email(email) {
    const text = 'SELECT * FROM worker WHERE email = $1'
    const value = [email]
    try {
      const res = await client.query(text, value)
      user = res.rows[0]
      setRows(user)
      return res.rows[0]
    }
    catch(e) {
        console.error(e.stack)
        return null
      }
  },
  async function id(id) {
    const text = 'SELECT * FROM worker WHERE id = $1'
    const value = [id]
    try {
      const res = await client.query(text, value)
      user = res.rows[0]
      setRows(user)
      return res.rows[0]
    }
    catch(e) {
        console.error(e.stack)
        return null
    }
  }
)

app.set('view-engine', 'ejs')
app.set('port', process.env.PORT || 3000)

app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}))
app.use(passport.initialize())
app.use(passport.session())

app.use(express.static(__dirname + '/public'));

app.use(methodOverride('_method'))

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.get("/edit", checkAuthentication, async (req, res) => {
  try {
    const query = "SELECT * FROM compliance_row WHERE id = $1"
    const value = [req.query.id]
    client
      .query(query, value)
      .then( response => {
        if(response.rows[0].account != user.account)
        {
          console.log('response.rows[0].account = ' + response.rows[0].account)
          console.log('user.account = ' + user.account);
          req.logOut()
          return res.redirect('login')
        }
        console.log('response.rows[0].account = ' + response.rows[0].account)
        console.log('user.account = ' + user.account);
        res.render('./edit.ejs', { name: user.name, row: response.rows[0]})
      })
      .catch(e => {
        console.error(e.stack)
        res.redirect('/')
      })
  }
  catch {
    res.redirect('/')
  }
})

function dateCheck(inputDate)
{
  if(inputDate == "MM/DD/YYYY")
  {
    return null
  }
  return inputDate
}

app.post("/edit", checkAuthentication, async (req, res) => {
  try {
    date1 = dateCheck(req.body.last_done)
    date2 = dateCheck(req.body.next_to_do)
    date3 = dateCheck(req.body.last_assessed)
    date4 = dateCheck(req.body.last_reviewed)
    date5 = dateCheck(req.body.next_review)
    how_often = req.body.freq
    if(how_often == 'select one')
    {
      how_often = null
    }
    const query = "UPDATE compliance_row SET policy_name = $1, policy_location = $2, policy_link = $3, procedure_name = $4, procedure_location = $5, procedure_link = $6, evidence_type = $7, evidence_location = $8, evidence_link = $9, freq = $10,	last_done = $11,	next_to_do = $12,	how_to_comply = $13, owner = $14,	criteria = $15, results = $16, last_assessed = $17,	last_reviewed = $18, next_review = $19, legal_requirements = $20, control = $21 WHERE id = $22"
    const value = [req.body.policy_name, req.body.policy_location, req.body.policy_link, req.body.procedure_name, req.body.procedure_location, req.body.procedure_link, req.body.evidence_type, req.body.evidence_location, req.body.evidence_link, how_often,	date1,	date2,	req.body.how_to_comply, req.body.owner,	req.body.criteria, req.body.results, date3,	date4, date5, req.body.legal_requirements, req.body.control, req.body.id]
    console.log('In post')
    client
      .query(query, value)
      .then( response => {
        res.redirect('/')
      })
      .catch(e => {
        console.error(e.stack)
        res.redirect('/')
      })
  }
  catch {
    res.redirect('/')
  }
})

app.get("/", checkAuthentication, function(request, response){
  response.render('index.ejs', { name: user.name, id: user.id, email: user.email, rows: rows });
})

app.post("/login", checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.post('/register', checkNotAuthenticated, async (req, response) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const accountQuery = "SELECT id FROM account WHERE code = $1"
    if(req.body.account != null && req.body.account != '')
    {
      makeUser(req.body.account, req.body.name, req.body.email, hashedPassword, response)
/*      const accountQuery = "SELECT id FROM account WHERE code = $1"
      const accountValue = [req.body.account]
      client
        .query(accountQuery, accountValue)
        .then( res => {
          console.log('res.rows[0].id = ' + res.rows[0].id)
          account = res.rows[0].id
          console.log('account inner = ' + account)
          if(account == null)
          {
            keep_going = false
            let code = -1
            while(keep_going)
            {
              console.log('in keep_going')
          //    code = Math.round(Math.random() * CODE_POSSIBILITIES).toString()
              code = Math.random().toString(36).substring(2,15) + Math.random().toString(36).substring(2, 15);
              const codeQuery = "SELECT COUNT(*) FROM account WHERE code = $1"
              const codeValue = [code]
              console.log('about to call client')
              client
                .query(codeQuery, codeValue)
                .then( res => {
                  console.log('in res')
                /*  if(res == null || res.rows == null || res.rows[0] == null || res.rows[0].id == null) */

  /*                {
                    console.log('in null check')
                    keep_going = false
                  }
                })
                .catch(e => {
                  console.error(e.stack)
                })
            }
            // Need to make account
            console.log('I am about to make an account');
            const accountText = 'INSERT INTO account (code) VALUES ($1)'
            const accountValue = [code]
            client
              .query(accountText, accountValue)
              .then( res => {
                const codeQuery = "SELECT id FROM account WHERE code = $1"
                client
                  .query(codeQuery, accountValue)
                  .then( res => {
                    account = res.rows[0].id

                    // now we need to make rows for the new account
                    // First we get all the template rows
                    const template = "SELECT * FROM compliance_row WHERE id = 2"
                    client
                      .query(template)
                      .then(res => {
                        var x = 0;
                        while(x < res.rows.length) {
                          owner = res.rows[x].owner
                          if(owner == 'Admin')
                          {
                            owner = req.body.name
                          }
                          const query = 'INSERT INTO compliance_row (control, policy_name, policy_location, policy_link, procedure_name, procedure_location, procedure_link, evidence_type, evidence_location, evidence_link, freq,	last_done,	next_to_do,	how_to_comply, owner,	criteria, results, last_assessed,	last_reviewed, next_review, legal_requirements, account, spot, is_header) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)'
                          const in_values = [res.rows[x].control, res.rows[x].policy_name, res.rows[x].policy_location, res.rows[x].policy_link, res.rows[x].procedure_name, res.rows[x].procedure_location, res.rows[x].procedure_link, res.rows[x].evidence_type, res.rows[x].evidence_location, res.rows[x].evidence_link, res.rows[x].freq,	res.rows[x].last_done,	res.rows[x].next_to_do,	res.rows[x].how_to_comply, owner,	res.rows[x].criteria, res.rows[x].results, res.rows[x].last_assessed,	res.rows[x].last_reviewed, res.rows[x].next_review, rows[x].legal_requirements, account, rows[x].spot, rows[x].is_header]
                          client
                            .query(query, in_values)
                            .then( res => {
                              console.log(res.rows[x])
                            })
                            .catch(e => {
                              console.error(e.stack)
                              response.redirect('/register')
                            })
                          x++
                        }
                      })
                      .catch(e => {
                        console.error(e.stack)
                        response.redirect('/register')
                      })
                  })
                  .catch(e => {
                    console.error(e.stack)
                    response.redirect('/register')
                  })
              })
              .catch(e => {
                console.error(e.stack)
                response.redirect('/register')
              })
          }
          const text = 'INSERT INTO worker (name, email, password, account) VALUES ($1, $2, $3, $4)'
          const values = [req.body.name, req.body.email, hashedPassword, account]
          client
            .query(text, values)
            .then(res => {
              response.redirect('/login')
            })
        })
        .catch(e => {
          console.error(e.stack)
        })
        console.log('account outer = '+ account);*/

    }
    else
    {
      const code = getCode()
      await makeAccount(code, req.body.name, req.body.email, hashedPassword, response)
  /*    keep_going = true
      while(keep_going)
      {
        console.log('in keep_going')
    //    code = Math.round(Math.random() * CODE_POSSIBILITIES)
        code = Math.random().toString(36).substring(2,15) + Math.random().toString(36).substring(2, 15);
        const codeQuery = "SELECT COUNT (*) FROM account WHERE code = $1"
        console.log("code = " + code);
        const codeValue = [code]
        console.log('about to call client')
    /*    client.query(codeQuery, codeValue, function (err, result){
          console.log(result);
        })*/
/*        client.query(codeQuery, codeValue)
          .then( resQuery => {
            console.log('in res')
            console.log('resQuery = ' + resQuery);
            if(resQuery == null || resQuery.rows == null || resQuery.rows[0] == null || resQuery.rows[0].id == null)
            {
              console.log('in null check')
              keep_going = false
            }
          })
          .catch(e => {
            console.error(e.stack)
          })*/
    //  }
      // Need to make account

  }
}
    catch {
        response.redirect('/register')
      }
  })

app.get('/login', checkNotAuthenticated, async (req, res) => {
  res.render('login.ejs')
})

app.get('/register', checkNotAuthenticated, async (req, res) => {
  res.render('register.ejs')
})

app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('login')
})

function checkAuthentication(req, res, next) {
  if(req.isAuthenticated()) {
    return next()
  }
  res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
  if(req.isAuthenticated()) {
    return res.redirect('/')
  }
  next()
}

app.listen(3000, function(){
  console.log("Server started on port 3000");
});
