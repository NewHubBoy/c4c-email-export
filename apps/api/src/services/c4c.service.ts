import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";

type ODataCollection<T> = {
  d?: {
    results?: T[];
  };
};

@Injectable()
export class C4cService {
  private normalizeTenantUrl(tenantUrl: string) {
    if (!tenantUrl?.trim()) {
      throw new BadRequestException("tenantUrl is required.");
    }
    try {
      const url = new URL(tenantUrl.trim());
      return url.origin;
    } catch (error) {
      throw new BadRequestException("tenantUrl must be a valid URL.");
    }
  }

  private buildAuthHeader(username?: string, password?: string) {
    const resolvedUsername = username || process.env.C4C_USERNAME;
    const resolvedPassword = password || process.env.C4C_PASSWORD;
    if (!resolvedUsername || !resolvedPassword) {
      throw new BadRequestException(
        "Basic Auth credentials are required."
      );
    }
    const token = Buffer.from(
      `${resolvedUsername}:${resolvedPassword}`
    ).toString("base64");
    return `Basic ${token}`;
  }

  private escapeOdataString(value: string) {
    return value.replace(/'/g, "''");
  }

  private buildUrl(
    tenantUrl: string,
    path: string,
    params: Record<string, string>
  ) {
    const baseUrl = this.normalizeTenantUrl(tenantUrl);
    const url = new URL(path, baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  }

  private async request<T>(
    tenantUrl: string,
    path: string,
    params: Record<string, string>,
    authHeader: string
  ) {
    const url = this.buildUrl(tenantUrl, path, params);
    const response = await fetch(url, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new BadGatewayException(
        `Upstream error ${response.status}: ${body || response.statusText}`
      );
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new BadGatewayException("Upstream response was not valid JSON.");
    }
  }

  private async getServiceRequestObjectId(
    tenantUrl: string,
    ticketId: string,
    authHeader: string
  ) {
    if (!ticketId?.trim()) {
      throw new BadRequestException("ticketId is required.");
    }
    const filter = `ID eq '${this.escapeOdataString(ticketId.trim())}'`;
    const data = await this.request<ODataCollection<{ ObjectID?: string }>>(
      tenantUrl,
      "/sap/c4c/odata/v1/c4codataapi/ServiceRequestCollection",
      {
        $filter: filter,
        $format: "json"
      },
      authHeader
    );
    const results = data?.d?.results || [];
    const objectId = results[0]?.ObjectID;
    if (!objectId) {
      throw new NotFoundException("Ticket not found or missing ObjectID.");
    }
    return objectId;
  }

  async getServiceRequestTexts(
    tenantUrl: string,
    ticketId: string,
    username?: string,
    password?: string
  ) {
    const authHeader = this.buildAuthHeader(username, password);
    const objectId = await this.getServiceRequestObjectId(
      tenantUrl,
      ticketId,
      authHeader
    );
    const data = await this.request(
      tenantUrl,
      `/sap/c4c/odata/v1/c4codataapi/ServiceRequestCollection('${this.escapeOdataString(
        objectId
      )}')/ServiceRequestTextCollection`,
      {
        $format: "json"
      },
      authHeader
    );

    return {
      objectId,
      data
    };
  }

  async getInternalMemos(
    tenantUrl: string,
    ticketId: string,
    username?: string,
    password?: string
  ) {
    const authHeader = this.buildAuthHeader(username, password);
    const objectId = await this.getServiceRequestObjectId(
      tenantUrl,
      ticketId,
      authHeader
    );

    const referenceFilter = `ParentObjectID eq '${this.escapeOdataString(
      objectId
    )}' and TypeCode eq '39'`;
    const references = await this.request<ODataCollection<{ ID?: string }>>(
      tenantUrl,
      "/sap/c4c/odata/v1/c4codataapi/ServiceRequestBusinessTransactionDocumentReferenceCollection",
      {
        $filter: referenceFilter,
        $format: "json"
      },
      authHeader
    );

    const referenceResults = references?.d?.results || [];
    const activities = await Promise.all(
      referenceResults
        .map((reference) => reference.ID)
        .filter(Boolean)
        .map((id) =>
          this.request(
            tenantUrl,
            "/sap/c4c/odata/v1/c4codataapi/ActivityCollection",
            {
              $filter: `ID eq '${this.escapeOdataString(
                String(id)
              )}' and TypeCode eq '39' and ProcessingTypeCode eq '0011'`,
              $expand: "ActivityText",
              $format: "json"
            },
            authHeader
          )
        )
    );

    return {
      objectId,
      references,
      activities
    };
  }

  async getEmailNotes(
    tenantUrl: string,
    ticketId: string,
    emailActivityId: string | undefined,
    username?: string,
    password?: string
  ) {
    const authHeader = this.buildAuthHeader(username, password);
    const objectId = await this.getServiceRequestObjectId(
      tenantUrl,
      ticketId,
      authHeader
    );

    const references = await this.request(
      tenantUrl,
      "/sap/c4c/odata/v1/c4codataapi/ServiceRequestBusinessTransactionDocumentReferenceCollection",
      {
        $filter: `ParentObjectID eq '${this.escapeOdataString(objectId)}'`,
        $format: "json"
      },
      authHeader
    );

    if (!emailActivityId) {
      return {
        objectId,
        references
      };
    }

    const emailNotes = await this.request(
      tenantUrl,
      "/sap/c4c/odata/v1/c4codataapi/EMailCollection",
      {
        $filter: `ID eq '${this.escapeOdataString(emailActivityId)}'`,
        $expand: "EMailNotes",
        $format: "json"
      },
      authHeader
    );

    return {
      objectId,
      references,
      emailNotes
    };
  }
}
