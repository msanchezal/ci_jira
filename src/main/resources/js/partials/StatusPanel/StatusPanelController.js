/**
 * Explicit load of the controller, to be used
 * into a JIRA Panel.
 */
function statusController() {
	AJS.$(document).ready(
		function() {
			Bootstrap.start(function(){
				var self = this;

				var status = {
					ci : '',
					jira : '',
					remediationKey: '',
					issueId: ''
				};

				/**
				 * Get the status of ci
				 * @param  {String}   jiraIssueId The Jira issue id
				 */
				self.getStatusRemediationItem = function( remediationItemKey ){
					var environment = remediationsService.getEnvironmentFromRemediationItem( remediationItemKey );
					var remediationItem = remediationsService.getFiltersByRemediationItem( environment, remediationItemKey );

					remediationItem.done(function(remediationsItems){
						if( remediationsItems.assets.length > 0){
							status.ci = remediationsItems.assets[0][0].state;
							self.syncronizeStatus();
	                        self.printHtml();
	                    }
			        });
				};

				/**
				 * Print the status on html
				 */
				self.printHtml = function() {
					var panelElement = AJS.$("#remediationStatusPanel");
					panelElement.empty();
                    if( status.ci ){
                    	panelElement.append("Status : <span class='aui-lozenge aui-lozenge-current'>" + status.ci + '</span>');
                    }
				};

				/**
				 * Syncronize status between jira and cloud insight
				 */
				self.syncronizeStatus = function() {

					if ( status.ci === "planned" || status.ci === "incomplete" ) {
						if( status.jira === "Closed"){
							var transation = jiraService.Issue().doTransition( status.issueId, 're-open', AJS.I18n.getText("ci.partials.statuspanel.js.msg.syncronize.open"));

							transation.done(function() {
								JIRA.Messages.showWarningMsg( AJS.I18n.getText("ci.partials.statuspanel.js.msg.syncronize.open"));
								JIRA.trigger(JIRA.Events.REFRESH_ISSUE_PAGE, [JIRA.Issue.getIssueId()]);
							});
						}
				    }

				    if ( status.ci === "disposed" || status.ci == "complete" || status.ci === "verified" ) {
				    	if( status.jira != "Closed"){
					    	var transation = jiraService.Issue().doTransition( status.issueId, 'close', AJS.I18n.getText("ci.partials.statuspanel.js.msg.syncronize.close") );

					    	transation.done(function() {
					    		JIRA.Messages.showWarningMsg( AJS.I18n.getText("ci.partials.statuspanel.js.msg.syncronize.close") );
								JIRA.trigger(JIRA.Events.REFRESH_ISSUE_PAGE, [JIRA.Issue.getIssueId()]);
							});
						}
                    }
				}

				/**
				 * Review that the issue has the minimun information to search in CI the remediation
				 * @param  {issue}   issue
				 */
				self.isValidIssue = function( issueData ) {

					//validate that the custom field exist
					var fields = jiraService.Field().getFields();
					var remediationItemCustomName = fields.remediationItem;

	                if( remediationItemCustomName == null )
	                {
	                	return false;
					}

					//validate that the issue have a custom field
					if( !issueData.fields.hasOwnProperty( remediationItemCustomName ) ) {
				    	return false;
				    }

				    //validate that remediation item has a value
				    if( issueData.fields[ remediationItemCustomName ] == null ) {
				    	return false;
				    }

				    status.remediationKey = issueData.fields[ remediationItemCustomName ];

				    return true;
				}

				/**
				 * Load the status of a remediation,
				 * @param  {String}   jiraIssueId The Jira issue id
				 */
				self.loadRemediationStatus = function( jiraIssueId ) {
					status.issueId = jiraIssueId;

					var issue = jiraService.Issue().getById( jiraIssueId );

					issue.success(function( issueData ) {
						status.jira = issueData.fields.status.name;

						if( self.isValidIssue( issueData ) )
						{
							self.getStatusRemediationItem( status.remediationKey );

							//Verify status every 4 seconds.
							setTimeout(function(){
								loadRemediationStatus( globalIssueID );
							}, configService.timeRefresh );
						}
					    else{
					    	var panelElement = AJS.$("#remediationStatusMessage");
					    	//remove span element if this exist
 					    	var spanElement = AJS.$("#remediationStatusMessage span");
							spanElement.remove();
		                    panelElement.append("<span>" + AJS.I18n.getText("ci.partials.statuspanel.js.msg.isnotaremediation") + '</span>');
		                }
					});

					issue.error(function() {
						JIRA.Messages.showWarningMsg( AJS.I18n.getText("ci.partials.statuspanel.js.msg.issuenotexist") );
					});

				};

				if (typeof globalIssueID !== 'undefined') {
					loadRemediationStatus( globalIssueID );
				}

			});
		}
	);
}