import {useState, useEffect} from 'react';
import './App.css';

import initSqlJs from 'sql.js/dist/sql-wasm.js';

const App = () => {
  const [name, setName] = useState("");
  const [userID, setUserID] = useState();
  const [userObtained, setUserObtained] = useState(false);
  const [db, setDb] = useState(null);

  // Set Data for Enrolled
  const [enrolled, setEnrolled] = useState([]);
  const [coachData, setCoachData] = useState([]);
  const [availCourse, setAvailCourse] = useState([]);

  // state for a bunch of tables to show or to be hidden
  const [showEnrolledTable, setEnrolledTable] = useState(false);
  const [showCoachingTable, setCoachingTable] = useState(false);
  const [showByGame, setByGame] = useState(false);
  const [showByCategory, setByCategory] = useState(false);
  const [showByDifficulty, setByDifficulty] = useState(false);

  // useState gameTitle entered and category
  const [gameTitle, setGame] = useState("");
  const [searched, setSearched] = useState(false);
  const [categorized, setCategorized] = useState(false);
  const [categories, setCategory] = useState([]);
  const [selectedDifficulty, setDifficulty] = useState(1);

  // Last state for difficulty
  const [showDifficultyTable, setDifficultyTable] = useState(false);

  // State to track selected rows by course_code (or any unique identifier)
  const [selectedRows, setSelectedRows] = useState(new Set());

  var messageUser = "Let's get started! Please enter your username"
  
  const displayCoachingCourses = () => {
    // Flip all the switches when coaching table is set
    setCoachingTable(true);
    setEnrolledTable(false);
    setByGame(false);
    setByCategory(false);
    setSearched(false);
    setCategorized(false);
    setByDifficulty(false);
    setDifficultyTable(false);

    if(db){ // Checks if the database is null or not first before command
      const coaching = db.exec("SELECT course_code FROM userCoachCourses WHERE user_id = ?", [userID]);
      setCoachingTable(!showCoachingTable);
      // If enrollment already exists then fetch add it to the enrolled courses list otherwise don't.
      if (coaching && coaching.length > 0 && coaching[0].values.length > 0) {
        // get the remaining value
        setCoachData(coaching[0].values.map(row => row[0]));
        
      } 
      else{
        setCoachData([]);
      }
      setCoachingTable(!showCoachingTable);
    }
  }

  const displayEnrolledCourses = () => {
    setCoachingTable(false);
    setEnrolledTable(true);
    setByGame(false);
    setByCategory(false);
    setSearched(false);
    setCategorized(false);
    setByDifficulty(false);
    setDifficultyTable(false);

    if(db){ // Checks if the database is null or not first before command
      const enroll = db.exec("SELECT course_code FROM userEnrolledInCourses WHERE user_id = ?", [userID]);
      // If enrollment already exists then fetch add it to the enrolled courses list otherwise don't.
      if (enroll && enroll.length > 0 && enroll[0].values.length > 0) {
        // get the remaining value
        setEnrolled(enroll[0].values.map(row => row[0]));
      } 
      else{
        setEnrolled([]);
      }
      setEnrolledTable(!showEnrolledTable);
    }
  }

  const displayGameSearchMenu = () => {
    setCoachingTable(false);
    setEnrolledTable(false);
    setByGame(true);
    setByCategory(false);
    setSearched(false);
    setCategorized(false);
    setByDifficulty(false);
    setDifficultyTable(false);
  }

  const displayDifficultySearch = () => {
    setCoachingTable(false);
    setEnrolledTable(false);
    setByGame(false);
    setByCategory(false);
    setSearched(false);
    setCategorized(false);
    setByDifficulty(true);

    if(db){
      const theQuery = 'SELECT * FROM course WHERE difficulty = ?'
      const filteredValues = db.exec(theQuery, [Number(selectedDifficulty)]);

      if(filteredValues && filteredValues.length > 0 && filteredValues[0].values.length > 0){ // Give it time to load
        setAvailCourse(filteredValues[0].values);
        setByDifficulty(true);
        setDifficultyTable(true); 
      }
      else{
        setAvailCourse([]);
      }
    }
  }

  const displayGameSearch = () => { // Get the courses with the game selected
    if(db){
      const courseDisplay = db.exec("SELECT * FROM course WHERE g_title = ?",[gameTitle]);
      if (courseDisplay && courseDisplay.length > 0 && courseDisplay[0].values.length > 0) {
        setAvailCourse(courseDisplay[0].values);
      }
      else{
        setAvailCourse([]);
      }
    }
    setSearched(true);
  }

  const displayCategorySearch = () => {
    setCoachingTable(false);
    setEnrolledTable(false);
    setByGame(false);
    setByDifficulty(false);
    

    if(db){
      const result = db.exec('SELECT DISTINCT category FROM game');
      if (result && result.length > 0 && result[0].values.length > 0) {
        const cList = result[0].values || [];

        const cNames = cList.map((row) => row[0]);
        console.log(cNames);
        setCategory(cNames);
        setByCategory(true);  
      }
    }
  }

  const serveGames = (category) => {
    // Use the category to get all the designated games
    const gameResult = db.exec('SELECT title FROM game WHERE category = ?', [category]);

    if (gameResult && gameResult.length > 0 && gameResult[0].values.length > 0){
      const gameTitles = gameResult[0].values.map((row)=> row[0]);
      
      // set the query
      const courseQuery = 'SELECT * FROM course WHERE g_title IN (' + gameTitles.map(() => '?').join(', ') + ')';
      const courseResult = db.exec(courseQuery, gameTitles);
      if(gameResult && gameResult.length > 0 && gameResult[0].values.length > 0){
        setAvailCourse(courseResult[0].values);
        setCategorized(true);
      }
    }
  } 

  // Data base loading initially
  useEffect(() => {
    const loadDatabase = async () => {
      try {
        const SQL = await initSqlJs({
          locateFile: (file) => {
            if (file === "sql-wasm.wasm") {
              return "https://unpkg.com/sql.js@1.12.0/dist/sql-wasm.wasm";  // CDN URL for sql-wasm.wasm
            }
            return file;  // Return the file path for other assets (e.g., the js file itself)
          }
        });
        // fetch the SQLite database from the public folder (or from a remote URL)
        const response = await fetch("/coachingDatabase.db");
        const arrayBuffer = await response.arrayBuffer();
        
        // load it into sql.js
        const loadedDb = new SQL.Database(new Uint8Array(arrayBuffer));
        setDb(loadedDb); 

        const result = loadedDb.exec("SELECT * FROM user");
        console.log(result);
      } catch (error) {
        console.error('Error loading or querying the database:', error);
      }
    };
    loadDatabase();
  }, []);


   // Log userID when it changes, using useEffect
  useEffect(() => {
      if(db){ // Checks if the database is null or not first before command
        const enroll = db.exec("SELECT course_code FROM userEnrolledInCourses WHERE user_id = ?", [userID]);
        // If enrollment already exists then fetch add it to the enrolled courses list otherwise don't.
        if (enroll && enroll.length > 0 && enroll[0].values.length > 0) {
          // get the remaining value
          setEnrolled(enroll[0].values.map(row => row[0]));
        } 
        else{
          setEnrolled([]);
        }
        setEnrolledTable(!showEnrolledTable);
      }
        // Proceed with any further logic, such as enrolling the user in courses
  }, [userID]); // This effect runs when userID state is updated
  
  useEffect(() => {
    if(db) {
    if (selectedDifficulty !== undefined) {
      const theQuery = 'SELECT * FROM course WHERE difficulty = ?';
      const filteredValues = db.exec(theQuery, [Number(selectedDifficulty)]);
  
      if (filteredValues && filteredValues.length > 0 && filteredValues[0].values.length > 0) {
        setAvailCourse(filteredValues[0].values);
        setDifficultyTable(true);
      } else {
        setAvailCourse([]);  // Clear courses if no results
        setDifficultyTable(false);
      }
    }
  }
  }, [selectedDifficulty]); // This effect will run every time `selectedDifficulty` changes
  
  function userNameInputted(){  
    setUserObtained(!userObtained);
    if (db && name){
      // Check if the username exists already, if not add the user to the database, if yes then no need to add
      let theQuery = "SELECT 1 FROM user WHERE name = ? LIMIT 1";
      const checkDB = db.exec(theQuery, [name]);

      if(!(checkDB && checkDB.length > 0 && checkDB[0].values.length > 0)){
        // If it doesn't exist we need to add the user to the table
        theQuery = "INSERT INTO user (name) VALUES (?)";
        db.run(theQuery, [name]); // this inserts the user into the database
        
        setEnrolled([]);
      }
      // Check what user id they have
      const result = db.exec("SELECT user_id FROM user WHERE name = ? LIMIT 1", [name]);
      console.log("Query result for user_id:", result);

      if (result && result.length > 0 && result[0].values.length > 0) { // allow program to catch up with result
        setUserID(result[0].values[0][0]); // save user id 
      }

  }
  
}
  function handleCheckboxChange (courseCode) {
    setSelectedRows((prev) => {
      const newSelection = new Set(prev);
      if(newSelection.has(courseCode)) { // meaning it was already selected
        newSelection.delete(courseCode);
      }
      else{
        newSelection.add(courseCode);
      }
      return newSelection;
    });
    
  };
  const handleDifficultMenu = (event) => {
    setDifficulty(Number(event.target.value));
  }
  function insertUser (coachOrStudent){
    const selectedCourses = availCourse.filter(row => selectedRows.has(row[0])); // get the rows for each course code    
    
    const query = 'INSERT OR IGNORE INTO ' + coachOrStudent + ' (user_id, course_code) values(?,?)'; // coach or student depends on which button was pressed. Should contain the table name
    selectedCourses.forEach((course) => {
      const courseCode = course[0];
      // First check if the user is already enrolled as a student or a coach in that particular course. In which case they should not be able to do anything
      const result = db.exec('SELECT COUNT(*) FROM userEnrolledInCourses WHERE user_id = ? and course_code = ?', [userID, course[0]]);
      if(!(result[0].values[0][0] > 0) ){
        console.log(!result[0].values[0][0] > 0);
        const result2 = db.exec('SELECT COUNT(*) FROM userCoachCourses WHERE user_id = ? and course_code = ?', [userID, course[0]]);
        if (!(result2[0].values[0][0] > 0) ){
          console.log(!result2[0].values[0][0] > 0);
          const valueS = [userID, courseCode];
          db.exec(query, valueS);
          alert("Inserted into " + coachOrStudent + " table");
        }
        else{
          alert("You are enrolled as a coach for this course already.");
        }
      }
      else{
        alert("You are enrolled as a student for this course already.");
      }
    })
  };

  return (
    <div className="App">
    {/*We need inputs for the following:
    - Inputting a Game 
    - The name of the user
    - Category
    - Difficulty also like a dropbox (1-5)
    */}

      {/* First the input for the user*/}
      <h1>Welcome to the Online Coaching Platform for Gaming</h1>
      <h2>{messageUser} </h2>
      <div className="userEntry"><input type="text" disabled={userObtained} placeholder="Enter Username" value={name} onChange={(e) => setName(e.target.value)}/> 
      <button id="userButton" onClick={()=> userNameInputted()} disabled={userObtained} >Enter</button>{/* For entering user name */}
      </div>
      
      {/* After they login as the user, 3 buttons should be shown:
      - Enrolled Courses, Coaching Courses, Search Courses by Game Title, Search Course by Game Category*/}
      {userObtained ? (
        <>
          <button disabled={showEnrolledTable} onClick={() => displayEnrolledCourses()}>Enrolled Courses</button>
          <button disabled={showCoachingTable} onClick={() => displayCoachingCourses()}>Coaching Courses</button>
          <button disabled={showByGame} onClick={() => displayGameSearchMenu()}>Search By Game Title</button>
          <button disabled={showByCategory} onClick={() => displayCategorySearch()}>Search By Category</button>
          <button disabled={showByDifficulty} onClick={() => displayDifficultySearch()}>Difficulty</button>
        </>
      ) : (
        null
      )}
      { showByDifficulty && (
        <>
          <h3>Select a number from 1-5:</h3>
          <select id="number" value={selectedDifficulty} onChange={handleDifficultMenu}>
            {[1,2,3,4,5].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </>
      )}

    {showDifficultyTable && (
      <>
      <div>
        <h2>Table of Courses (Difficulty Search)</h2>
        <button onClick={() => insertUser('userEnrolledInCourses')}>Enroll</button>
        <button onClick={() => insertUser('userCoachCourses')}>Coach</button>
        <table>
          <thead>
            <tr>
            <th>Choose</th>
            <th>Course Code</th>
            <th>Description</th>
            <th>Schedule</th>
            <th>Price</th>
            <th>Duration</th>
            <th>Difficulty</th>
            <th>Game Title</th>
            </tr>
          </thead>
          <tbody>
          {availCourse.map((row, index)=>(
           <tr key={index}>
            <td>
              <input
              type="checkbox"
              checked={selectedRows.has(row[0])}
              onChange ={() => handleCheckboxChange(row[0])}
              />
            </td>
            <td>{row[0]}</td>
            <td>{row[1]}</td>
            <td>{row[2]}</td>
            <td>{row[3]}</td>
            <td>{row[4]}</td>
            <td>{row[5]}</td>
            <td>{row[6]}</td>
           </tr> 
          ))}
          </tbody>
        </table>
      </div>
      </>
    )}

      {showByGame ? (
        <>
          <div>
            <input type="text" placeholder="Enter Game Title" value={gameTitle} onChange={(e) => setGame(e.target.value)}/>
            <button onClick={() => displayGameSearch()}>Search</button>
          </div>
        </>
      ) : (
        null
      )}

      {showByCategory ? (
        <>
          {categories.map((category) => {
            return(
            <div>
              <button key={category} onClick={() => serveGames(category)}>
                {category}
              </button>
            </div>
            );
          })}
        </>
      ): (
        null
      )}

      {showEnrolledTable && (
        <>
        <div style={{textAlign: 'center'}}>
          <h2>Enrolled Courses</h2>
          <table style={{margin: '0 auto'}}>
            <thead>
              <tr>
                <th>Course Code</th>
              </tr>
            </thead>
            <tbody>
              {enrolled.length > 0 ? (
                enrolled.map((course, index) => (
                  <tr key={index}>
                    <td>{course}</td> {/* user[0] is user_id */}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2">Not Enrolled</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
      )}

      {showCoachingTable && (
        
        <div style={{textAlign: 'center'}}>
          <h2>Courses You Coach</h2>
          <table style={{margin: '0 auto'}}>
            <thead>
              <tr>
                <th>Course Code</th>
              </tr>
            </thead>
            <tbody>
              {coachData.length > 0 ? (
                coachData.map((course, index) => (
                  <tr key={index}>
                    <td>{course}</td> {/* user[0] is user_id */}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2">Not Coaching</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    {/*We need buttons for the following:
    - Search button for hitting search for a game
    - Username Entry
    - Category (should be a dropbox)
    */}

    {categorized && (
      <>
      <div>
        <h2>Table of Courses (Category Search)</h2>
        <button onClick={() => insertUser('userEnrolledInCourses')}>Enroll</button>
        <button onClick={() => insertUser('userCoachCourses')}>Coach</button>
        <table>
          <thead>
            <tr>
            <th>Choose</th>
            <th>Course Code</th>
            <th>Description</th>
            <th>Schedule</th>
            <th>Price</th>
            <th>Duration</th>
            <th>Difficulty</th>
            <th>Game Title</th>
            </tr>
          </thead>
          <tbody>
          {availCourse.map((row, index)=>(
           <tr key={index}>
            <td>
              <input
              type="checkbox"
              checked={selectedRows.has(row[0])}
              onChange ={() => handleCheckboxChange(row[0])}
              />
            </td>
            <td>{row[0]}</td>
            <td>{row[1]}</td>
            <td>{row[2]}</td>
            <td>{row[3]}</td>
            <td>{row[4]}</td>
            <td>{row[5]}</td>
            <td>{row[6]}</td>
           </tr> 
          ))}
          </tbody>
        </table>
      </div>
      </>
    )}
    
    {searched ? (
      <>
      <h2>Table of Courses (Game Title)</h2>
      <button onClick={() => insertUser('userEnrolledInCourses')}>Enroll</button>
      <button onClick={() => insertUser('userCoachCourses')}>Coach</button>
      <table border="1">
        <thead>
          <tr>
            <th>Choose</th>
            <th>Course Code</th>
            <th>Description</th>
            <th>Schedule</th>
            <th>Price</th>
            <th>Duration</th>
            <th>Difficulty</th>
            <th>Game Title</th>
          </tr>
        </thead>
        <tbody>
          {availCourse.map((row, index)=>(
           <tr key={index}>
            <td>
              <input
              type="checkbox"
              checked={selectedRows.has(row[0])}
              onChange ={() => handleCheckboxChange(row[0])}
              />
            </td>
            <td>{row[0]}</td>
            <td>{row[1]}</td>
            <td>{row[2]}</td>
            <td>{row[3]}</td>
            <td>{row[4]}</td>
            <td>{row[5]}</td>
            <td>{row[6]}</td>
           </tr> 
          ))}
        </tbody>
      </table>
      </>
    ) :(
      null
    )}
    </div>
  );
}

export default App;
