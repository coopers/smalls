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
      var ldate = new Date(data.user.last_login_at);
      data.user.created_at = cdate.toLocaleDateString();
      data.user.last_login_at = ldate.toLocaleString();
      return data;
    },

    formatTickets: function(data) {
      data.tickets = data.tickets.reverse();
      this.listTicketsByStatus(data)
      this.satisfactionBoolean(data)
      this.setTicketsId(data);
      for (i = 0; i < data.tickets.length; i++) {
        this.formatTicketDate(data.tickets[i]);
        this.setTicketIndex(data.tickets[i], i);
      }
    },

    satisfactionBoolean: function(data) {
      for (i = 0; i < data.tickets.length; i++) {
        if (data.tickets[i].satisfaction_rating != undefined) {
          if (data.tickets[i].satisfaction_rating.score != 'unoffered') {
            data.tickets[i].satisfaction_offered = true;
          }
        }
      }
    },

    listTicketsByStatus: function(data) {
      var statusPriority = ["new", "open", "pending", "hold", "solved", "closed"];
      var ticketsListedByStatus = [];
      for (state in statusPriority) {
        var state = statusPriority[state];
        for (i = 0; i < data.tickets.length; i++) {
          if (data.tickets[i].status == state) {
            ticketsListedByStatus.push(data.tickets[i]);
          }
        }
      }
      data.tickets = ticketsListedByStatus;
    },

    setTicketsId: function(data) {
      data.ticketsId = data.tickets[0].id;
    },

    formatTicketDate: function(ticket) {
      var tdate = new Date(ticket.created_at);
      ticket.created_at = tdate.toLocaleDateString();
    },

    setTicketIndex: function(ticket, index) {
      ticket.index = index + 1;
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
                this.formatTickets(data)
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
