const fs = require('fs')
const async = require('async')
const mysql = require('mysql') // module to get info from database
const debug = require('debug')('timers')
const sqlFormatter = require('sql-formatter')

// directory where the images are stored with respect to present file
const imgDirectory = './uploadedImages/'
var db // database connection variable

const DBInfo = JSON.parse(fs.readFileSync('DBcredentials.json', 'utf8'))
debug(DBInfo)

module.exports = () => {
  cleanBadImages()
  setInterval(cleanBadImages, 1000 * 60 * 60) // every hour
}

// goes through the db and find inexistanf images, if so, delete them
function cleanBadImages () {
  // get all production entries
  var query = `SELECT * FROM ${DBInfo.db_tables.denuncias} WHERE PROD=1 AND uuid!='87332d2a0aa5e634'`

  debug(sqlFormatter.format(query))

  db = mysql.createConnection(DBInfo)

  async.series([
    (next) => {
      db.connect((err) => {
        if (err) {
          console.error('error connecting: ' + err.stack)
          next(Error(err))
        } else {
          debug('User ' + DBInfo.user + ' connected successfully to database ' + DBInfo.database + ' at ' + DBInfo.host)
          next()
        }
      })
    },
    (next) => {
      db.query(query, (err, results, fields) => {
        if (err) {
          // error handling code goes here
          debug('Error inserting user data into database: ', err)
          next(Error(err))
        } else {
          // debug('Result from db query is : ', results)
          async.each(results, processDBentry, (err) => {
            if (err) {
              debug('An error occurred')
              next(Error(err))
            } else {
              debug('All entries processed successfully')
              next()
            }
          })
        }
      })
    },
    (next) => {
      db.end((err) => {
        if (err) {
          next(Error(err))
        } else {
          debug('DB connection closed successfully')
          next()
        }
      })
    }
  ],
  (err, results) => {
    if (err) {
      console.log('There was an error: ')
      console.log(err)
    } else {
      debug('Timer function "cleanBadImages" run successfully')
    }
  })
}

function processDBentry (entry, callback) {
  var photoArray = [entry.foto1, entry.foto2, entry.foto3, entry.foto4]

  var deleteEntry = true
  for (var i = 0; i < photoArray.length; i++) {
    if (photoArray[i]) {
      const fileName = imgDirectory + photoArray[i]
      if (fs.existsSync(fileName)) {
        deleteEntry = false
      } else {
        debug(`file ${fileName} does not exist`)
      }
    }
  }

  if (deleteEntry) {
    debug('Entry is to be deleted since no photos are available: ', entry)
    const query = `DELETE from ${DBInfo.db_tables.denuncias} ` +
      `WHERE carro_matricula='${entry.carro_matricula}' AND uuid='${entry.uuid}' AND foto1='${entry.foto1}'`
    debug(sqlFormatter.format(query))

    db.query(query, (err, results, fields) => {
      if (err) {
        // error handling code goes here
        debug('Error deleting entry from database: ', err)
        callback(Error(err))
      } else {
        debug('Entry deleted successfully')
        callback()
      }
    })
  } else {
    // does not delete entry
    callback()
  }
}
