In the c4codataapi service, all texts of a service request (description, interaction, notes, etc.) can be found in the ServiceRequestTextCollection. To navigate to the text collection of a specific ticket, follow the below steps:

1. Find your ticket using the following URL: https://<YourTenantURL>/sap/c4c/odata/v1/c4codataapi/ServiceRequestCollection?$filter=ID eq 'XYZ' (where "XYZ" stands for the ID of the ticket)
2. Copy the ticket's ObjectID.
3. To navigate to the text collection node, use this URL: https://<YourTenantURL>/sap/c4c/odata/v1/c4codataapi/ServiceRequestCollection('<ObjectID>')/ServiceRequestTextCollection
4. The TypeCode and TypeCodeText entities identify the type of text (e.g. Internal Comment, case Description) and the Text entity shows the content of the text.

Internal memos that are maintained as interactions (without that actual interactions with customer happened) can be retrieved the following way:

1. Find your ticket using the following URL: https://<YourTenantURL>/sap/c4c/odata/v1/c4codataapi/ServiceRequestCollection?$filter=ID eq 'XYZ' (where "XYZ" stands for the ID of the ticket)
2. In the result, copy the ticket's ObjectID 
3. Now retrieve data for ticket ObjectID: https://<YourTenantURL>/sap/c4c/odata/v1/c4codataapi/ServiceRequestBusinessTransactionDocumentReferenceCollection?$filter=ParentObjectID eq '<ticket object id>' and TypeCode eq '2574' 
4. In the result, copy the ID (you may find it by searching for: <d:ID)**
   **
5. Now retrieve data for this ID: https://<YourTenantURL>/sap/c4c/odata/v1/c4codataapi/ActivityCollection?$filter=ID eq '<ID from previous step>' and TypeCode eq '2574' and ProcessingTypeCode eq '0011'&$expand=ActivityText
6. Find the internal memo in the following section: <d:Text>abc</d:Text> (where "abc" stands for the text of the memo)

Notes for e-mails are part of a different OData collection. To navigate to these notes, please follow these instructions:

1. With the ObjectID of the relevant ticket, access this URL: https://<YourTenantURL>/sap/c4c/odata/v1/c4codataapi/ServiceRequestBusinessTransactionDocumentReferenceCollection?$filter=ParentObjectID eq '<ServiceRequestObjectID>'
2. This will provide you a list, identified by the TypeCode and TypeCodeText.
3. Locate the relevant e-mail and copy its ID.
4. With this information, access the following URL: https://<YourTenantURL>/sap/c4c/odata/v1/c4codataapi/EMailCollection?$filter=ID eq 'XYZ'&$expand=EMailNotes
5. Where the "XYZ" is the Email Activity ID