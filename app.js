(function() {

  return {

    events: {

      'userGetRequest.done': 'this.showInfo',
      'userGetRequest.fail': 'this.showError',
      'app.activated':'getInfo'
    },

    requests: {

      orgGetRequest: function(id) {
        return {
          url: '/api/v2/organizations/' + id + '.json',
          type:'GET',
          dataType: 'json'
        };
      },

      ticketsGetRequest: function(id) {
        return {
          url: '/api/v2/users/' + id + '/tickets/requested.json',
          type:'GET',
          dataType: 'json'
        };
      },

      userGetRequest: function(id) {
        return {
          url: '/api/v2/users/' + id + '.json',
          type:'GET',
          dataType: 'json'
        };
      }
    },

    formatDates: function(data) {
      var cdate = new Date(data.user.created_at);
      data.user.created_at = cdate.toLocaleDateString();
      return data;
    },

    formatTickets: function(data) {
      data.tickets = data.tickets.reverse();
      this.setTicketSatisfactionStatus(data);
      this.listTicketsByStatus(data);
      this.setStatusCounts(data);
      this.setTicketsId(data);
      for (var i = 0; i < data.tickets.length; i++) {
        this.formatTicketDate(data.tickets[i]);
      }
    },

    setTicketSatisfactionStatus: function(data) {
      var tickets = data.tickets
      for (var i = 0; i < tickets.length; i++) {
        var ticket = tickets[i]
        var feedback = this.getTicketFeedback(ticket)
        var acceptableFeedback = ['good', 'bad']
        if (this.contains(acceptableFeedback, feedback)) {
          ticket.status = feedback;
        }
      }
    },

    getTicketFeedback: function(ticket) {
      if (ticket.satisfaction_rating !== undefined) {
        return ticket.satisfaction_rating.score
      }
      return false
    },

    contains: function(collection, value) {
      for (var i = 0; i < collection.length; i++) {
        if (collection[i] === value) {
          return true;
        }
      }
      return false;
    },

    listTicketsByStatus: function(data) {
      var statusPriority = ["new", "open", "pending", "hold", "solved", "closed", "good", "bad"];
      var ticketsListedByStatus = [];
      for (var state in statusPriority) {
        state = statusPriority[state];
        for (var i = 0; i < data.tickets.length; i++) {
          var ticket = data.tickets[i]
          if (ticket.status == state) {
            ticketsListedByStatus.push(ticket);
          }
        }
      }
      data.tickets = ticketsListedByStatus;
    },

    setStatusCounts: function(data) {
      data.user.ticketCounts = this.getStatusCounts(data)
    },

    getStatusCounts: function(data) {
      var tickets = data.tickets
      var statusCollection = {}
      var ticketCount = tickets.length
      for (var i = 0; i < ticketCount; i++) {
        var ticket = tickets[i]
        var status = ticket.status      
        if (statusCollection.hasOwnProperty(status)) {
          statusCollection[status]++;
        } else {
          statusCollection[status] = 1;
        }
      }
      return this.packageStatusCounts(statusCollection, ticketCount);
    },

    packageStatusCounts: function(statusCollection, ticketCount) {
      var statusCounts = [];
      for (status in statusCollection) {
        var statusCount = statusCollection[status]
        var statusObj = {};
        statusObj["name"] = status;
        statusObj["count"] = statusCount;
        statusObj["percentOfTickets"] = Math.floor(statusCount/ticketCount*100);
        statusCounts.push(statusObj);
      }
      this.statusCountsMustBe100(statusCounts)
      return statusCounts;
    },

    statusCountsMustBe100: function(statusCounts) {
      var percentTarget = 100;
      var percentTotal  = 0;
      var percentDiff   = 0;
      for (var i = 0; i < statusCounts.length; i++) {
        var statusCount = statusCounts[i]
        percentTotal = percentTotal + statusCount.percentOfTickets
      }
      percentDiff = percentTarget - percentTotal
      for (var i = 0; i < percentDiff; i++) {
        statusCount = statusCounts[i]
        statusCount.percentOfTickets++
      }
      for (var i = 0; i < statusCounts.length; i++) {
        statusCount = statusCounts[i]
        var percent = statusCount.percentOfTickets
        statusCount["cssPercentString"] = this.setCSSPercentString(percent);
      }
      return statusCounts;
    },

    setCSSPercentString: function(percent) {
      percent = "_" + percent.toString();
      return percent
    },

    setTicketsId: function(data) {
      data.ticketsId = data.tickets[0].id;
    },

    formatTicketDate: function(ticket) {
      var ticketDate = new Date(ticket.created_at);
      var currentTime = Date.now()
      var diff = Math.floor((currentTime.valueOf() - ticketDate.valueOf()) / 1000)

      function Time(max, divisor, string) {
        this.max     = max;
        this.divisor = divisor;
        this.string  = string;
      }

      var seconds = new Time(60, 1, "seconds");
      var minutes = new Time(60*60, 60, "minutes");
      var hours   = new Time(60*60*24, 60*60, "hours");
      var days    = new Time(60*60*24*30, 60*60*24, "days");
      
      var timeCollection = [];
      timeCollection.push(seconds);
      timeCollection.push(minutes);
      timeCollection.push(hours);
      timeCollection.push(days);

      for (var time in timeCollection) {
        time = timeCollection[time];
        if (diff < time.max) {
          var increment = Math.floor(diff / time.divisor);
          increment = increment.toString() + " " + time.string + " ago";
          ticket.created_at = increment;
          return ticket;
        }
      }

      ticket.created_at = ticketDate.toLocaleDateString();
      return ticket;
    },

    getInfo: function() {
      var id = this.ticket().requester().id();
      this.ajax('userGetRequest', id);
    },

    showInfo: function(data) {
      this.formatDates(data);
      if (data.user.organization_id == null) {
        this.switchTo('requester', data);
      } else {
        this.ajax('orgGetRequest', data.user.organization_id).then(
          function(org_data) {
            data.user.organization_name = org_data.organization.name;
            data.user.organization_url = org_data.organization.domain_names[0];
            this.ajax('ticketsGetRequest', data.user.id).then(
              function(tickets_data) {
                data.tickets = tickets_data.tickets;
                data.user.ticketCount = tickets_data.tickets.length;
                this.formatTickets(data);
                console.log(data.user.ticketCounts);
                this.switchTo('requester', data);
              }
            );
          },
          function() {
            this.showError();
          }
        );
      }
    },

    showError: function() {
      this.switchTo('error');
    }
  };

}());
