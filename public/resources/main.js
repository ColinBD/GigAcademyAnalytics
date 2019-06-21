/*
TO DO:
>make it prettier by replacing the loading message using CSSFX library https://cssfx.dev/
>change the icon from my RP icon
*/

let got = {
  people: false,
  teams: false,
  peopleInTeams: false
};

class Person {
  constructor(name, id) {
    this.name = name;
    this.id = id;
  }

  campfireChats = 0;
  chatsList = [];
  messagesSent = 0;
  messagesList = [];
  questionnaire = 0;
  toDos = 0;
  emailsForwarded = 0;
  schedule = 0;
  docsAndFiles = 0;

  present() {
    //note: automatic check-ins are called questionnaires in the api return
    //individual to do data is not available through the basecamp api
    $("#acContent").html(`
			<h2>Stats for ${this.name}</h2>
      <ul>
        <div class="metricContainer">
          <div class="metricTitle">
            <li>Campfire chats sent: <strong>${this.campfireChats}</strong></li>
          </div>
          <div class="metricChart">
            <canvas id="myChartChats"></canvas>
          </div>
        </div>
        <div class="metricContainer">
          <div class="metricTitle">
            <li>Messages sent: <strong>${this.messagesSent}</strong></li>
          </div>
          <div class="metricChart">
            <canvas id="myChartMessages"></canvas>
          </div>
        </div>
        <div class="metricContainer">
          <div class="metricTitle">
            <li>Automatic check-ins: <strong>${this.questionnaire}</strong></li>
          </div> 
          <div class="metricChart">
            <canvas id="myChartCheckins"></canvas>
          </div>
        </div>
        <div class="metricContainer">
          <div class="metricTitle">
            <li>Emails forwarded: <strong>${this.emailsForwarded}</strong></li>
          </div>
          <div class="metricChart">
            <canvas id="myChartEmails"></canvas>
          </div>
        </div>
        <div class="metricContainer">
          <div class="metricTitle">
            <li>Scheduled events created: <strong>${this.schedule}</strong></li>
          </div>
          <div class="metricChart">
            <canvas id="myChartEvents"></canvas>
          </div>
        </div>
        <div class="metricContainer">
          <div class="metricTitle">
            <li>Docs and files uploaded: <strong>${
              this.docsAndFiles
            }</strong></li>
          </div>
          <div class="metricChart">
            <canvas id="myChartDocs"></canvas>
          </div>	
        </div>
      </ul>`);

    //now draw the charts
    drawChart("myChartChats", this.chatsList);
    drawChart("myChartMessages", this.messagesList);
    //drawChart("myChartCheckins");
    //drawChart("myChartEmails");
    //drawChart("myChartEvents");
    //drawChart("myChartDocs");
  }
}

class Team {
  constructor(name, id) {
    this.name = name;
    this.id = id;
  }
  people = [];
  campfireChats = 0;
  chatsList = [];
  messagesSent = 0;
  messagesSentList = [];
  questionnaire = 0;
  toDos = 0;
  emailsForwarded = 0;
  schedule = 0;
  docsAndFiles = 0;

  present() {
    //note: automatic check-ins are called questionnaires in the api return
    $("#acContent").html(`
			<h2>Stats for ${this.name}</h2>
			<ul>
        <div class="metricContainer">
          <div class="metricTitle">
            <li>Campfire chats sent: <strong>${this.campfireChats}</strong></li>
          </div>
          <div class="metricChart">
              <canvas id="myChartChats"></canvas>
          </div>
        </div>
        <div class="metricContainer">
          <div class="metricTitle">
            <li>Messages sent: <strong>${this.messagesSent}</strong></li>
          </div>
          <div class="metricChart">
              <canvas id="myChartMessages"></canvas>
          </div>
        </div>
        <div class="metricContainer">
          <div class="metricTitle">
            <li>Automatic check-ins: <strong>${
              this.questionnaire
            }</strong></li> 
          </div>
          <div class="metricChart">
              <canvas id="myChartCheckins"></canvas>
          </div>
        </div>
        <div class="metricContainer">
          <div class="metricTitle">
            <li>To-dos completed: <strong>${this.toDos}</strong></li>
          </div>
          <div class="metricChart">
              <canvas id="myChartToDos"></canvas>
          </div>
        </div>
        <div class="metricContainer">
          <div class="metricTitle">
            <li>Emails forwarded: <strong>${this.emailsForwarded}</strong></li>
          </div>
          <div class="metricChart">
              <canvas id="myChartEmails"></canvas>
          </div>
        </div>
        <div class="metricContainer">
          <div class="metricTitle">
            <li>Scheduled events created: <strong>${this.schedule}</strong></li>
          </div>
          <div class="metricChart">
              <canvas id="myChartEvents"></canvas>
          </div>
        </div>
        <div class="metricContainer">
          <div class="metricTitle">
            <li>Docs and files uploaded: <strong>${
              this.docsAndFiles
            }</strong></li>	
          </div>
          <div class="metricChart">
              <canvas id="myChartDocs"></canvas>
          </div>
        </div>
        </ul>`);

    //now draw the charts
    drawChart("myChartChats", this.chatsList);
    drawChart("myChartMessages", this.messagesSentList);
    //drawChart("myChartCheckins");
    //drawChart("myChartToDos");
    //drawChart("myChartEmails");
    //drawChart("myChartEvents");
    //drawChart("myChartDocs");
  }
}

let people = []; //this will hold all the Person objects associated with the project
let teams = []; //this will hold all the Team objects associated with the project
let admins = []; //this will hold a list of admins which will be used when filtering the data for collected stats
let adminList = ""; //the admin IDs as one long string
let projectStartDate = ""; //this will hold the date the project was created - used when graphing engagement

function processSelectedAccount() {
  got.people = false;
  got.teams = false;
  got.peopleInTeams = false;
  $("#acContent")
    .html("<span id='loading'>Loading...</span>")
    .css("display", "block"); //clear stats and show the loading message
  //loop through the selected account's projects list
  fetch(`/projects/${account.id}/${account.token}`)
    .then(result => result.json())
    .then(result => {
      $("#selectParticipant")
        .children()
        .remove(); //clear the selection box in preparation for filling it with data
      $("#selectTeam")
        .children()
        .remove(); //clear the selection box in preparation for filling it with data
      $("#selectParticipant").append(
        $("<option>", {
          value: "",
          text: "- choose -",
          selected: true,
          disabled: true
        })
      ); //add to selection list
      $("#selectTeam").append(
        $("<option>", {
          value: "",
          text: "- choose -",
          selected: true,
          disabled: true
        })
      ); //add to selection list
      //clear the people and team arrays and date var
      people = [];
      teams = [];
      projectStartDate = "";

      const data = JSON.parse(result.data);
      data.map(item => {
        if (item.purpose == "team") {
          teams.push(new Team(item.name, item.id)); //add to team array
          $("#selectTeam").append(
            $("<option>", { value: item.id, text: item.name })
          ); //add to selection list
        } else if (item.purpose == "company_hq") {
          //we can get the people list from here
          //store the ID for this project and we'll use it to get people
          account.HQ_id = item.id;
          //store the project start date
          projectStartDate = item.created_at;
          getPeople();
        }
      });
      //check if we've finished loading the data
      got.teams = true;
      if (got.people == true && got.teams == true) {
        selectedAccountDOMUpdate();
      }
    })
    .catch(error => {
      console.error(error);
    });
}

function getPeople() {
  //get the list of people associated with the account and flesh out the 'people' array with Person objects
  fetch(`/getPeople/${account.id}/${account.token}/${account.HQ_id}`)
    .then(result => result.json())
    .then(result => {
      const data = JSON.parse(result.data);
      data.map(item => {
        //if people are admins then add them to the admins array which will be used for filtering
        if (item.admin == true) {
          admins.push(item.id);
        }
        if (item.personable_type !== "Integration" && item.admin == false) {
          people.push(new Person(item.name, item.id)); //add to people array
          $("#selectParticipant").append(
            $("<option>", { value: item.id, text: item.name })
          ); //add to selection list
        }
      });
      //check if we've finished loading the data
      got.people = true;
      if (got.people == true && got.teams == true) {
        selectedAccountDOMUpdate();
      }
    })
    .catch(error => {
      console.error(error);
    });
}

function selectedAccountDOMUpdate() {
  $("#btnSwitchAc").css("visibility", "visible"); //show the switch accounts buttons
  $("#schoolName")
    .html(`for  ${account.name}`)
    .css("visibility", "visible"); //prepare & show the "for account..." header label
  $("#selectorBar").css("display", "inline-block"); //display selector bar
  $("#loading").css("display", "none"); //remove the loading message
  //load more data
  loadMore();
}

function loadMore() {
  //now flesh out the teams with all the people in the team
  for (let index = 0; index < teams.length; index++) {
    // fetch the list of users associated with each team
    fetch(`/getPeopleInTeams/${account.id}/${account.token}/${teams[index].id}`)
      .then(result => result.json())
      .then(result => {
        //put the returned data into the team array object
        const data = JSON.parse(result.data);
        for (let i = 0; i < data.length; i++) {
          teams[index].people.push(data[i].id);
          teams[index].people.push(data[i].name);
        }
        got.peopleInTeams = true;
      })
      .catch(error => console.error(error));
  }
}

//triggered by a 'select participant' drop-down interaction
function changeParticipant(index) {
  //reset the other selection box default values
  $("#selectTeam :nth-child(1)").prop("selected", true);
  $("#selectStat :nth-child(1)").prop("selected", true);
  if (got.peopleInTeams != true) {
    //show the still loading message
    $("#acContent")
      .html(
        "<span id='loading'>Still generating background data on people. Please try again shortly</span>"
      )
      .css("display", "block"); //clear stats and show the loading message
  } else {
    //proceed to generate the stats for this person
    $("#acContent")
      .html("<span id='loading'>Loading...</span>")
      .css("display", "block"); //clear stats and show the loading message
    //check what team the person is in
    let teamID = [];
    for (let i = 0; i < teams.length; i++) {
      if (teams[i].people.includes(people[index].id)) {
        teamID.push(teams[i].id);
      }
    }
    console.log(
      `this person was found in ${teamID.length} teams and has id ${
        people[index].id
      }`
    );
    if (teamID.length == 0) {
      $("#acContent").html(`
      <p>This user was not found in any account</p>`);
      return;
    }
    //As a person could be in more than one team we must loop through their teams, adding the results from each team before putting these collated results into the people object.
    let dockItems = {
      chats: 0,
      chatsList: [],
      messages: 0,
      messagesList: [],
      questionnaires: 0,
      toDos: 0,
      emails: 0,
      schedule: 0,
      docs: 0
    };
    let awaiting = teamID.length;
    for (let i = 0; i < teamID.length; i++) {
      fetch(
        `/getPersonInfo/${account.id}/${account.token}/${people[index].id}/${
          teamID[i]
        }`
      )
        .then(result => result.json())
        .then(result => {
          //put the returned data into the team array object
          // console.log(
          //   `Getting stats for ${people[index].name} who has ID: ${
          //     people[index].id
          //   }`
          // );
          //console.dir(result);
          const data = JSON.parse(result.data);
          dockItems.chats += data.chat;
          dockItems.chatsList = [...dockItems.chatsList, ...data.chatList];
          dockItems.messages += data.message_board;
          dockItems.messagesList = [
            ...dockItems.messagesList,
            ...data.message_boardList
          ];
          dockItems.questionnaires += data.questionnaire;
          dockItems.toDos += data.toDos;
          dockItems.emails += data.inbox;
          dockItems.schedule += data.schedule;
          dockItems.docs += data.vault;
          awaiting--;
          if (awaiting == 0) {
            //prepare stats for this person
            people[index].campfireChats = dockItems.chats;
            people[index].chatsList = dockItems.chatsList;
            people[index].messagesSent = dockItems.messages;
            people[index].messagesList = dockItems.messagesList;
            people[index].questionnaire = dockItems.questionnaires;
            people[index].toDos = dockItems.toDos;
            people[index].emailsForwarded = dockItems.emails;
            people[index].schedule = dockItems.schedule;
            people[index].docsAndFiles = dockItems.docs;
            console.dir(people[index]);
            people[index].present(); //display the team data on screen
          }
        })
        .catch(error => console.error(error));
    }
  }
}

//triggered by a 'select group' drop-down interaction
function changeTeam(index) {
  $("#acContent")
    .html("<span id='loading'>Loading...</span>")
    .css("display", "block"); //clear stats and show the loading message
  //reset the other selection box default values
  $("#selectParticipant :nth-child(1)").prop("selected", true);
  $("#selectStat :nth-child(1)").prop("selected", true);
  //generate the admin IDs list
  adminList = "";
  admins.map(item => (adminList += item));
  //prepare team stats
  fetch(
    `/getTeamInfo/${account.id}/${account.token}/${
      teams[index].id
    }/${adminList}`
  )
    .then(result => result.json())
    .then(result => {
      //put the returned data into the team array object
      const data = JSON.parse(result.data);
      teams[index].campfireChats = data.chat;
      teams[index].chatsList = data.chatList;
      teams[index].messagesSent = data.message_board;
      teams[index].messagesSentList = data.message_boardList;
      teams[index].questionnaire = data.questionnaire;
      teams[index].toDos = data.todoset;
      teams[index].emailsForwarded = data.inbox;
      teams[index].schedule = data.schedule;
      teams[index].docsAndFiles = data.vault;
      console.dir(teams[index]);
      teams[index].present(); //display the team data on screen
    })
    .catch(error => console.error(error));
}

function changeStat(index) {
  $("#acContent")
    .html("<span id='loading'>Loading...</span>")
    .css("display", "block"); //clear stats and show the loading message
  //reset the other selection box default values
  $("#selectParticipant :nth-child(1)").prop("selected", true);
  $("#selectTeam :nth-child(1)").prop("selected", true);
  $("#acContent").html(`
			<h2>${index.value} stats</h2>
			<p>Relevant statistical information will go here</p>`);
}

function drawChart(chart, list) {
  let newList = [];
  let presentationList = [];
  //aim is to count the number of days between dates then chart these gaps and spikes
  if (list.length > 0) {
    //vars we need
    const oneDay = 24 * 60 * 60 * 1000; //hours*minutes*seconds*milliseconds
    let a = new Date(projectStartDate);
    //the list has newest occurances first, oldest occurances last!
    //therefore first one is between the proj start and list[list.length -1] i.e. last list entry
    let b = new Date(list[list.length - 1]);
    let days = Math.floor((b.getTime() - a.getTime()) / oneDay);
    newList.push(days);
    //loop through the remaining days until
    for (let i = list.length - 1; i > 0; i--) {
      a = new Date(list[i]);
      b = new Date(list[i - 1]);
      days = Math.floor((b.getTime() - a.getTime()) / oneDay);
      newList.push(days);
    }
    //finally calculate between last loop day and now
    a = new Date(list[0]);
    b = new Date(); //now/today
    days = Math.floor((b.getTime() - a.getTime()) / oneDay);
    newList.push(days);
    console.dir(newList);
    //now construct the presentation list
    //for each number in newlist, we insert that number of 1's zeros into presentation list before putting in a '1'..or more
    if (newList[0] == 0) {
      //check if newList has zeros in a row due to items entered on the same day
      let i = 1;
      let count = 0; //stores the number of zeros we find in a row
      while (i < newList.length - 1) {
        if (newList[i] == 0) {
          //if next item was entered on the same day
          count++; //inc count
        } else {
          break;
        }
        i++;
      }
      //now we push in a number - normally 1 - which will be the bar height. >1 when multiple items were found on a day
      //although we skip the last one as the end should be zeros i.e. gap between last entry and current date
      presentationList.push(count + 1);
    }
    for (let i = 0; i < newList.length; i++) {
      if (newList[i] > 0) {
        //prepare the appropriate number of zeros
        let a = new Array(newList[i] - 1).fill(0);
        //check if newList has zeros in a row due to items entered on the same day
        let j = i;
        j++; //as we'll check the next item in the array
        let count = 0; //stores the number of zeros we find in a row
        while (j < newList.length - 1) {
          if (newList[j] == 0) {
            //if next item was entered on the same day
            count++; //inc count
          } else {
            break;
          }
          j++;
        }
        //now we push in a number - normally 1 - which will be the bar height. >1 when multiple items were found on a day
        //although we skip the last one as the end should be zeros i.e. gap between last entry and current date
        if (i < newList.length - 1) {
          a.push(count + 1);
        }
        //concatonate the array
        presentationList = [...presentationList, ...a];
      }
    }
  }
  if (presentationList.length == 0) {
    console.log("no presention list created");
    presentationList.push(0);
  }
  //we should now have our presentationList for the data
  //we need a corresponding labels list - we can fill it with empty strings
  var labelsList = new Array(presentationList.length).fill("");
  // let txt = projectStartDate.split("T"); //make start date label
  // labelsList[0] = txt[0];
  // //make the end label in the same format
  // var today = new Date();
  // var dd = today.getDate();
  // var mm = today.getMonth() + 1;
  // var yyyy = today.getFullYear();
  // if (dd < 10) {
  //   dd = "0" + dd;
  // }
  // if (mm < 10) {
  //   mm = "0" + mm;
  // }
  // today = yyyy + "-" + mm + "-" + dd;
  // labelsList[labelsList.length - 1] = today; //make end date label
  //console.log(`we will use the date ${projectStartDate} as the x-axis zero`);
  var ctx = document.getElementById(chart).getContext("2d");
  var chart = new Chart(ctx, {
    // The type of chart we want to create
    type: "bar",

    // The data for our dataset
    data: {
      //labels: ["", "", ""],
      //labels: generatelabels(30),
      labels: labelsList,
      datasets: [
        {
          label: "My First dataset",
          backgroundColor: "rgb(255, 99, 132)",
          borderColor: "rgb(255, 99, 132)",
          //data: [0, 2, 1]
          //data: generateRandomData(30)
          data: presentationList
        }
      ]
    },

    // Configuration options go here
    options: {
      legend: false,
      aspectRatio: 8,
      maintainAspectRation: false,
      scales: {
        xAxes: [
          {
            gridLines: {
              display: false
            }
          }
        ],
        yAxes: [
          {
            gridLines: {
              display: false
            }
          }
        ]
      }
    }
  });
}

function generateRandomData(num) {
  let array = Array(num).fill(0);
  //now fill 33% with 'other' values
  const fraction = num / Math.floor(Math.random() * 3 + 3); //between 1/3 and 1/6 of array will be changed
  for (let i = 0; i < fraction; i++) {
    array[Math.floor(Math.random() * num)] = Math.floor(Math.random() * 3 + 1);
  }
  return array;
}

function generatelabels(num) {
  return Array(num).fill("");
}
