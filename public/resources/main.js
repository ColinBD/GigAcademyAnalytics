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
  messagesSent = 0;
  pingsSent = 0;
  chatsSent = 0;
  docsAndFilesUploaded = 0;
  toDosAdded = 0;
  toDosCompleted = 0;
  present() {
    $("#acContent").html(`my name is ${this.name} and my id is ${this.id}`);
  }
}

class Team {
  constructor(name, id) {
    this.name = name;
    this.id = id;
  }
  people = [];
  campfireChats = 0;
  messagesSent = 0;
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
				<li>Campfire chats sent: ${this.campfireChats}</li>
				<li>Messages sent: ${this.messagesSent}</li>
				<li>Automatic check-ins: ${this.questionnaire}</li> 
				<li>To-dos completed: ${this.toDos}</li>
				<li>Emails forwarded: ${this.emailsForwarded}</li>
				<li>Scheduled events created: ${this.schedule}</li>
				<li>Docs and files uploaded: ${this.docsAndFiles}</li>	
			</ul>`);
  }
}

let people = []; //this will hold all the Person objects associated with the project
let teams = []; //this will hold all the Team objects associated with the project

function processSelectedAccount() {
  got.people = false;
  got.teams = false;
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
      //clear the people and team arrays
      people = [];
      teams = [];
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

  //load participants into the 'select participant' selector

  //load the groups into the groups selector
}

function getPeople() {
  //get the list of people associated with the account and flesh out the 'people' array with Person objects
  fetch(`/getPeople/${account.id}/${account.token}/${account.HQ_id}`)
    .then(result => result.json())
    .then(result => {
      const data = JSON.parse(result.data);
      data.map(item => {
        if (item.personable_type !== "Integration") {
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
        console.log(data.length);
        for (let i = 0; i < data.length; i++) {
          teams[index].people.push(data[i].id);
          teams[index].people.push(data[i].name);
        }
      })
      .catch(error => console.error(error));
  }
}

function changeParticipant(index) {
  $("#acContent")
    .html("<span id='loading'>Loading...</span>")
    .css("display", "block"); //clear stats and show the loading message
  //reset the other selection box default values
  $("#selectTeam :nth-child(1)").prop("selected", true);
  $("#selectStat :nth-child(1)").prop("selected", true);
  people[index].present();
}

function changeTeam(index) {
  $("#acContent")
    .html("<span id='loading'>Loading...</span>")
    .css("display", "block"); //clear stats and show the loading message
  //reset the other selection box default values
  $("#selectParticipant :nth-child(1)").prop("selected", true);
  $("#selectStat :nth-child(1)").prop("selected", true);
  //prepare team stats
  fetch(`/getTeamInfo/${account.id}/${account.token}/${teams[index].id}`)
    .then(result => result.json())
    .then(result => {
      //put the returned data into the team array object
      const data = JSON.parse(result.data);
      teams[index].campfireChats = data.chat;
      teams[index].messagesSent = data.message_board;
      teams[index].questionnaire = data.questionnaire;
      teams[index].toDos = data.todoset;
      teams[index].emailsForwarded = data.inbox;
      teams[index].schedule = data.schedule;
      teams[index].docsAndFiles = data.vault;

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
