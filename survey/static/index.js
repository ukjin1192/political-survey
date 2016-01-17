'use strict';

// Load bootstrap with custom configuration
require('bootstrap-webpack!./bootstrap.config.js');
require('./styles.scss');

var setCSRFToken = require('./module/setCSRFToken');
var setAuthToken = require('./module/setAuthToken');
var clearAuthToken = require('./module/clearAuthToken');
var getCaptcha = require('./module/getCaptcha');

$(document).on('click', '#refresh-captcha', getCaptcha);

// Validate captcha input and create user
$(document).on('submit', '#create-user-form', function(event) {
  event.preventDefault();

  // Clear alert message and hide it
  $('#create-user-form-alert-message').html('').addClass('hidden');

  var formData = new FormData();
  formData.append('captcha_key', $('#captcha-key').val());
  formData.append('captcha_value', $('#captcha-value').val());

  // Clear authentication and CSRF tokens at HTTP header
  clearAuthToken();
  setCSRFToken();

  $.ajax({
    url: '/api/users/',
    type: 'POST',
    data: formData,
    contentType: false,
    processData: false
  }).done(function(data) {
    // When captcha input is not valid
    if (data.state == false) {
      $('#create-user-form-alert-message').html('일치하지 않습니다').removeClass('hidden');
    } else {
      // Save user's token and ID
      localStorage.setItem('token', data.token);
      localStorage.setItem('user_id', data.id);
      
      // Clear captcha input form
      $('#captcha-key').val('');
      $('#captcha-value').val('');
      
      // Set authentication token at HTTP header
      setAuthToken();
      
      // Move to 1st survey page
      $.fn.fullpage.moveSectionDown();
    }
  }).fail(function(data) {
    console.log('Failed to create user: ' + data);
  }); 
});

$(document).on('click', '#get-party-result-btn', function() {
  // Set authentication and CSRF tokens  at HTTP header
  setAuthToken();
  setCSRFToken();

  var formData = new FormData();
  formData.append('category', 'party');

  $.ajax({
    url: '/api/results/',
    type: 'POST',
    data: formData,
    contentType: false,
    processData: false
  }).done(function(data) {
    // Move to result detail page
    location.href = '/result/' + data.id + '/';
  }).fail(function(data) {
    console.log('Failed to get result ID: ' + data);
  }); 
});

$(document).ready(function() {
  var pathname = window.location.pathname;

  // Main page with survey
  if (pathname == '/') {
    // Fill out captcha form
    getCaptcha();
    
    // Get all questions without user answers
    $.ajax({
      url: '/api/questions/',
      type: 'GET'
    }).done(function(data) {
      var totalQuestions = data.length;
      var totalSections = totalQuestions + 3;
      
      data.forEach(function(question, index) {
        var sectionDOM = $('#section-virtual-dom').clone().removeClass('hidden').removeAttr('id');
        sectionDOM.find('.progress-bar').css('width', (index + 1) / (totalQuestions + 1) * 100 + '%');
        sectionDOM.find('.question-id').val(question.id);
        sectionDOM.find('.question-order').val(index + 1);
        sectionDOM.find('.question-image').attr('data-src', question.image_url);
        sectionDOM.find('.question-explanation').html(question.explanation);
        
        var choices = question.choices;
        choices.forEach(function(choice) {
          sectionDOM.find('.question-choices').append('<div class="radio"><label>' + '<input type="radio" ' +
            'class="question-choice" name="question-' + question.id + '" value="' + choice.id + '" />' + 
            choice.context + '</label></div>');
        });
        
        $('#page-scroll-container .section').last().before(sectionDOM);
      });
      
      $('#section-virtual-dom').remove();
      
      // Activate bootstrap switch
      $('.question-weight').bootstrapSwitch({
        'offText': '공감되면 눌러주세요', 'onText': '공감되지 않으면 눌러주세요', 'handleWidth': '170px'});
      
      // Get user profile and answers, then fill out this data into questions
      if (localStorage.getItem('token') != null && localStorage.getItem('user_id') != null) {
        $('#check-data-existence-message').removeClass('hidden');
        
        // Set authentication token at HTTP header
        setAuthToken();
        
        // Get user profile
        $.ajax({
          url: '/api/users/' + localStorage.getItem('user_id') + '/',
          type: 'GET'
        }).done(function(data) {
          // Fill out profile
          $('input[name="sex"][value="' + data.sex + '"]').attr('checked', true);
          $('#year-of-birth').val(data.year_of_birth);
          $('#supporting-party').find('option[value="' + data.supporting_party + '"]').attr('selected', true);
          
          var completedSurvey = data.user_participated;
          
          // Get user answers
          $.ajax({
            url: '/api/answers/',
            type: 'GET'
          }).done(function(data) {
            // Fill out answers
            data.forEach(function(answer, index) {
              var questionBlock = $('.question-choice[type="radio"][value="' + answer.choice + '"]').
                attr('checked', true).closest('.question');
              questionBlock.find('.answer-id').val(answer.id);
              questionBlock.find('.original-choice-id').val(answer.choice);
              questionBlock.find('.original-weight').val(answer.weight);
              if (answer.weight == 1) {
                questionBlock.find('.question-weight').attr('checked', false);
              } else {
                questionBlock.find('.question-weight').attr('checked', true);
              }
            });
            
            if (completedSurvey) {
              $('#edit-survey-btn, #move-to-result-list-btn').removeClass('hidden');
            } else {
              var lastQuestionOrder = $('.question-choice[type="radio"]:checked').last().
                closest('section').find('.question-order').val();
              if (lastQuestionOrder >= 1 && lastQuestionOrder < totalQuestions) {
                $('#continue-survey-btn').attr('href', '#' + (lastQuestionOrder + 1)).removeClass('hidden');
              } else if (lastQuestionOrder == totalQuestions) {
                $('#continue-survey-btn').attr('href', '#additional').removeClass('hidden');
              } else {
                $('#continue-survey-btn').attr('href', '#tag').removeClass('hidden');
              }
            }
            $('#create-user-submit-btn').html('새로 시작하기 (기존 데이터 삭제)');
          }).fail(function(data) {
            console.log('Failed to get user answers: ' + data);
            clearAuthToken();
            localStorage.clear();
          }); 
        }).fail(function(data) {
          console.log('Failed to get user profile: ' + data);
          clearAuthToken();
          localStorage.clear();
        }).always(function() {
          $('#check-data-existence-message').addClass('hidden');
        }); 
      } else{
        localStorage.clear();
      }
      
      var anchorsList = ['main', 'tag'];
      for (var i = 1; i < totalQuestions + 1; i++) {
        anchorsList.push('Q' + i);
      }
      anchorsList.push('additional');
      
      // Inititate fullpage.js with options
      $('#page-scroll-container').removeClass('hidden').fullpage({
        // Enable anchor and history feature
        anchors: anchorsList,
        paddingTop: $('#header').outerHeight(),
        // Disables featutre moving to specific section when loaded
        animateAnchor: false,
        onLeave: function(index, nextIndex, direction){
          var leavingSection = $(this);
          
          if (index > 2 && index < totalSections) {
            var choiceID = leavingSection.find('.question-choice[type="radio"]:checked').val();
            var originalChoiceID = leavingSection.find('.original-choice-id').val();
            var answerID = leavingSection.find('.answer-id').val();
            var weight = leavingSection.find('.question-weight').is(':checked') + 1;
            var originalWeight = leavingSection.find('.original-weight').val();
            
            if (choiceID != undefined) {
              // Create answer
              if (answerID == '') {
                var formData = new FormData();
                formData.append('choice_id', choiceID);
                formData.append('weight', weight);
                formData.append('duration', 4);
                
                setAuthToken();
                setCSRFToken();
                
                $.ajax({
                  url: '/api/answers/',
                  type: 'POST',
                  data: formData,
                  contentType: false,
                  processData: false
                }).done(function(data) {
                  leavingSection.find('.answer-id').val(data.id);
                  leavingSection.find('.original-choice-id').val(data.choice);
                  leavingSection.find('.original-weight').val(data.weight);
                }).fail(function(data) {
                  console.log('Failed to create answer: ' + data);
                }); 
              }
              // Update answer
              else if (originalChoiceID != choiceID || originalWeight != weight) {
                var formData = new FormData();
                formData.append('choice_id', choiceID);
                formData.append('weight', weight);
                formData.append('duration', 4);
                
                setAuthToken();
                setCSRFToken();
                
                $.ajax({
                  url: '/api/answers/' + answerID + '/',
                  type: 'PATCH',
                  data: formData,
                  contentType: false,
                  processData: false
                }).done(function(data) {
                  leavingSection.find('.answer-id').val(data.id);
                  leavingSection.find('.original-choice-id').val(data.choice);
                  leavingSection.find('.original-weight').val(data.weight);
                }).fail(function(data) {
                  console.log('Failed to update answer: ' + data);
                }); 
              }
            }
          }
          // Start survey when user validated
          else if (index == 1) {
            if (localStorage.getItem('token') == null) return false;
          }
          // TODO save tags
          else if (index == 2) {
          }
          // TODO save additional info
          else if (index == totalSections) {
          }
        }
      });
    }).fail(function(data) {
      console.log('Failed to get questions: ' + data);
    }); 
  } 
  // Result list page
  else if (pathname == '/result/') {
  } 
  // Result detail page
  else if (/result\/(\d+)/.test(pathname)) {
    var answerID = pathname.match(/result\/(\d+)/)[1]
    
    // Set authentication token at HTTP header
    setAuthToken();
    
    $.ajax({
      url: '/api/results/' + answerID + '/',
      type: 'GET'
    }).done(function(data) {
      $('#result-detail').html(data.record);
    }).fail(function(data) {
      console.log('Failed to get result: ' + data);
    }); 
  }
});

$(window).load(function() {
  $('#loading-icon').addClass('hidden');
});
