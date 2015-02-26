;(function ($, _, document, window, undefined) {
  'use strict';

  $(document).ready( function() {
    $('.qw-dnd-upload').each( function() {
      var $this = $(this);
      var id = $this.attr('data-id');

      var input = [
        '<input class="qw-file-input" data-id="',
        id,
        '" type="file" style="display: none" multiple="multiple">'
      ].join('');

      var $input = $(input);
      $input.appendTo($('body'));
      $input.on( 'change', onInputChanged );
      $this.on( 'click', showFilePicker );

      $this[0].ondragover = function( evt ) {
        evt.preventDefault();
      };

      $this[0].ondrop = function( evt ) {
        evt.preventDefault();
        var files = evt.dataTransfer.files;
        $.each( evt.dataTransfer.files, function( file ) {
          enqueueFile( this, id );
        });
      };
    });
  });

  var showFilePicker = function( evt ) {
    var $this = $(this);
    var id = $this.attr('data-id');
    var $input = $('.qw-file-input[data-id="' + id + '"]');
    $input.trigger('click');
  };

  var onInputChanged = function( evt ) {
    var $this = $(this);
    var id = $this.attr('data-id');

    $.each( this.files, function() {
      enqueueFile( this, id );
    });
  };

  var files = {};
  var enqueueFile = function( file, id ) {
    if ( !files[id] ) {
      files[id] = [];
    }

    var container = '<div class="upload"><span class="title"></span><div class="progress"></div></div>';
    var $container = $(container);
    $container.children().each( function() {
      $(this).text( file.name );
    });

    var data = {
      file: file,
      container: $container
    };

    files[id].push( data );
    $container.appendTo( $('.qw-dnd-upload[data-id="' + id + '"] > .container') );

    if ( isAutoUpload( id ) ) {
      uploadNext( id );
    }
  };

  var uploadNext = function( id ) {
    var data = files[id].shift();

    if ( typeof data === 'undefined' ) {
      return;
    }

    var payload = new FormData();
    payload.append("filepath", data.file);
    payload.append("filename", data.file.name);
    payload.append("filecomment", '');

    var client = new XMLHttpRequest();
    client.onerror = error;
    client.onabort = log;

    var $container = $(data.container);
    client.upload.onprogress = function( evt ) {
      var val = Math.round( 100/evt.total * evt.loaded );
      var percent = val + '%';

      $container.find('div.progress').css('width', percent);

      // continue with next file
      if ( val === 100 ) {
        if ( isAutoUpload( id ) ) {
          uploadNext( id );
        }
      }
    };

    var wt = getWebTopic( id );
    var p = foswiki.preferences;
    var keyurl = [
      p.SCRIPTURLPATH,
      '/rest',
      p.SCRIPTTSUFFIX,
      '/DnDUploadPlugin/validation?topic=',
      wt.web,
      '.',
      wt.topic
    ].join('');

    var uploadurl = [
      p.SCRIPTURLPATH,
      '/upload',
      p.SCRIPTTSUFFIX,
      '/',
      wt.web,
      '.',
      wt.topic
    ].join('');

    $.get( keyurl, function( key ) {
      payload.append("validation_key", key);
      client.open( "POST", uploadurl );
      client.send( payload );
    });
  };

  var isAutoUpload = function( id ) {
    if ( !id ) {
      return false;
    }

    var sel = '.qw-dnd-upload[data-id="' + id + '"]';
    return $(sel).hasClass('auto');
  }

  var getWebTopic = function( id ) {
    var sel = '.qw-dnd-upload[data-id="' + id + '"]';
    var $cnt = $(sel);
    var data = {
      web: $cnt.attr('data-web'),
      topic: $cnt.attr('data-topic')
    };

    return data;
  };

  var log = function( msg ) {
    if ( window.console && console.log ) {
      console.log( msg );
    }
  };

  var error = function( msg ) {
    if ( window.console && console.error ) {
      console.error( msg );
    }
  };
}(jQuery, window._, window.document, window));
