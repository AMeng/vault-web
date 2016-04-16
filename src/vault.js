var Secret = function(name, secret, path) {
  var self = this;

  self.id = ko.observable(path + '/' + name);
  self.name = ko.observable(name);
  self.secret = ko.observable(secret);
  self.visible = ko.observable(false);

  self.fieldType = ko.computed(function() {
    return self.visible() ? 'password' : 'text';
  });

  self.buttonText = ko.computed(function() {
    return self.visible() ? 'Show' : 'Hide';
  });

  self.toggleVisible = function() {
    self.visible(!self.visible());
  }
}

var SecretCollection = function(path, secrets) {
  var self = this;

  self.path = ko.observable(path);
  self.secrets = ko.observableArray();

  if (secrets) {
    Object.keys(secrets).forEach(function(key, index) {
      if (key !== 'lease_duration') {
        self.secrets.push(new Secret(key, secrets[key]));
      }
    });
  }

  self.save = function() {
    var data = {};
    ko.utils.arrayForEach(self.secrets(), function(s) {
      data[s.name()] = s.secret();
    });
    page.apiWrite(self.path(), data);
  }
}

var AddForm = function() {
  var self = this;

  self.secretCollection = ko.observable();

  self.init = function() {
    self.secretCollection(new SecretCollection('secret/'));
    self.addEmptySecret();
  }

  self.submit = function() {
    $('#vaultAddModal').modal('hide');
    self.secretCollection().save();
    self.init();
  }

  self.addEmptySecret = function() {
    self.secretCollection().secrets.push(new Secret('', ''));
  }

  self.init();
}

var Page = function() {
  var self = this;

  self.endpoint = ko.observable(localStorage.vaultEndpoint);
  self.token = ko.observable(localStorage.vaultToken);
  self.secrets = ko.observableArray();
  self.addForm = ko.observable(new AddForm());
  self.vaultHealthResponse = ko.observable();
  self.vaultTokenResponse = ko.observable();

  self.endpoint.subscribe(function (text) {
    localStorage.vaultEndpoint = text;
  });

  self.token.subscribe(function (text) {
    localStorage.vaultTokenResponse = text;
  });

  self.reloadAll = function() {
    self.secrets([]);
    self.apiList('secret/');
  }

  self.getHeaders = function() {
    return {'X-Vault-Token': self.token()};
  }

  self.postHeaders = function() {
    var headers = self.getHeaders();
    headers['Content-Type'] = 'application/json';
    return headers;
  }

  self.getUrl = function(path) {
    return self.endpoint() + '/v1/' + path
  }

  self.apiHealth = function() {
    $.ajax({
      url: self.getUrl('sys/health'),
      success: self.apiHealthSuccess,
      error: onError
    });
  }

  self.apiToken = function() {
    $.ajax({
      url: self.getUrl('auth/token/lookup-self'),
      headers: self.getHeaders(),
      success: self.apiTokenSuccess,
      error: onError
    });
  }

  self.apiList = function(path) {
    $.ajax({
      url: self.getUrl(path),
      data: {'list': 'true'},
      headers: self.getHeaders(),
      success: self.apiListSuccess(path),
      error: onError
    });
  }

  self.apiRead = function(path) {
    $.ajax({
      url: self.getUrl(path),
      headers: self.getHeaders(),
      success: self.apiReadSuccess(path),
      error: onError
    });
  }

  self.apiWrite = function(path, data) {
    $.ajax({
      url: self.getUrl(path),
      data: toJson(data),
      method: 'POST',
      headers: self.postHeaders(),
      success: self.reloadAll,
      error: onError
    });
  }

  self.apiHealthSuccess = function(data) {
    self.vaultHealthResponse(toJson(data));
  }

  self.apiTokenSuccess = function(data) {
    self.vaultTokenResponse(toJson(data.data));
  }

  self.apiListSuccess = function(path) {
    return function(data) {
      var keys = data.data.keys;
      for (var key in keys) {
        var name = keys[key];
        if (name.endsWith('/')) {
          self.apiList(path + name);
        } else {
          self.apiRead(path + name);
        }
      }
    }
  }

  self.apiReadSuccess = function(path) {
    return function(data) {
      self.secrets.push(new SecretCollection(path, data.data));
    }
  }
}



var onError = function(response) {
  $('#errorModalBody').text(toJson(response));
  $('#errorModal').modal('show');
}

var toJson = function(object) {
  return JSON.stringify(object, null, 2)
}

var page = new Page();
ko.applyBindings(page);
