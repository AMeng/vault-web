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

  Object.keys(secrets).forEach(function(key, index) {
    if (key !== 'lease_duration') {
      self.secrets.push(new Secret(key, secrets[key]));
    }
  });
}

var Vault = function() {
  var self = this;

  self.endpoint = ko.observable(localStorage.vaultEndpoint);
  self.token = ko.observable(localStorage.vaultToken);
  self.secrets = ko.observableArray();
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

  self.getUrl = function(path) {
    return self.endpoint() + '/v1/' + path
  }

  self.apiHealth = function() {
    $.ajax({
      url: self.getUrl('sys/health'),
      success: self.apiHealthSuccess
    });
  }

  self.apiToken = function() {
    $.ajax({
      url: self.getUrl('auth/token/lookup-self'),
      headers: self.getHeaders(),
      success: self.apiTokenSuccess
    });
  }

  self.apiList = function(path) {
    $.ajax({
      url: self.getUrl(path),
      data: {'list': 'true'},
      headers: self.getHeaders(),
      success: self.apiListSuccess(path)
    });
  }

  self.apiRead = function(path) {
    $.ajax({
      url: self.getUrl(path),
      headers: self.getHeaders(),
      success: self.apiReadSuccess(path)
    });
  }

  self.apiHealthSuccess = function(data) {
    self.vaultHealthResponse(JSON.stringify(data, null, 2));
  }

  self.apiTokenSuccess = function(data) {
    self.vaultTokenResponse(JSON.stringify(data.data, null, 2));
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

var showError = function() {
  $('#errorModal').modal('show');
}

var vault = new Vault();
ko.applyBindings(vault);
