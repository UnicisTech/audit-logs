import {
    Get, Post, Delete, Route, Body, Query, Header, Path, SuccessResponse,
    Controller, Put, Request,
} from "tsoa";
import * as express from "express";
import * as uuid from "uuid";

import deleteTemplate from "../handlers/admin/deleteTemplate";
import deleteEnvironment from "../handlers/admin/deleteEnvironment";
import createDeletionRequest, { CreateDelReqRequestBody, CreateDelReqReport } from "../handlers/admin/createDeletionRequest";
import getDeletionRequest, { GetDelReqReport } from "../handlers/admin/getDeletionRequest";
import approveDeletionConfirmation from "../handlers/admin/approveDeletionConfirmation";
import updateApiToken from "../handlers/admin/updateApiToken";
import createApiToken from "../handlers/admin/createApiToken";
import deleteApiToken from "../handlers/admin/deleteApiToken";
import { ApiTokenResponse, ApiTokenValues } from "../models/api_token";
import { audit } from "../headless";

@Route("admin/v1")
export class AdminAPI extends Controller {

    /**
     * Delete a template. An overview of Template usage in Retraced can be found at
     *
     * https://preview.retraced.io/documentation/advanced-retraced/display-templates/
     *
     *
     * @param auth          Base64 ecoded JWT authentication
     * @param projectId     The project id
     * @param templateId    The id of the template to delete
     * @param environmentId The environment
     */
    @Delete("project/{projectId}/templates/{templateId}")
    @SuccessResponse("204", "Deleted")
    public async deleteTemplate(
        @Header("Authorization") auth: string,
        @Path("projectId") projectId: string,
        @Path("templateId") templateId: string,
        @Query("environment_id") environmentId: string,
    ): Promise<void> {
        await deleteTemplate(auth, projectId, templateId, environmentId);
        this.setStatus(204);
    }

    /**
     * Delete an environment and all of its dependents.
     * This is only allowed if
     * 1) the environment is empty (i.e. it lacks any recorded events), or
     * 2) an outstanding "deletion request" has been approved.
     *
     *
     * @param auth          Base64 ecoded JWT authentication
     * @param projectId     The project id
     * @param environmentId The environment to be deleted
     */
    @Delete("project/{projectId}/environment/{environmentId}")
    @SuccessResponse("204", "Deleted")
    public async deleteEnvironment(
        @Header("Authorization") auth: string,
        @Path("projectId") projectId: string,
        @Path("environmentId") environmentId: string,
    ): Promise<void> {
        await deleteEnvironment(auth, projectId, environmentId);
        this.setStatus(204);
    }

    /**
     * Create a resource deletion request and associated confirmation
     * requirements (as necessary).
     *
     *
     * @param auth          Base64 ecoded JWT authentication
     * @param projectId     The project id
     * @param environmentId The environment
     */
    @Post("project/{projectId}/environment/{environmentId}/deletion_request")
    @SuccessResponse("201", "Created")
    public async createDeletionRequest(
        @Header("Authorization") auth: string,
        @Path("projectId") projectId: string,
        @Path("environmentId") environmentId: string,
        @Body() requestBody: CreateDelReqRequestBody,
    ): Promise<CreateDelReqReport> {
        const result = await createDeletionRequest(
            auth, projectId, environmentId, requestBody,
        );
        this.setStatus(201);
        return result;
    }

    /**
     * Get the current status of an outstanding deletion request.
     *
     *
     * @param auth              Base64 ecoded JWT authentication
     * @param projectId         The project id
     * @param environmentId     The environment
     * @param deletionRequestId The id of the deletion request to look up
     */
    @Get("project/{projectId}/environment/{environmentId}/deletion_request/{deletionRequestId}")
    @SuccessResponse("200", "OK")
    public async getDeletionRequest(
        @Header("Authorization") auth: string,
        @Path("projectId") projectId: string,
        @Path("environmentId") environmentId: string,
        @Path("deletionRequestId") deletionRequestId: string,
    ): Promise<GetDelReqReport> {
        const result = await getDeletionRequest(
            auth, projectId, environmentId, deletionRequestId,
        );
        this.setStatus(200);
        return result;
    }

    /**
     * Mark a deletion confirmation as received (i.e. approve it).
     *
     *
     * @param auth              Base64 ecoded JWT authentication
     * @param projectId         The project id
     * @param environmentId     The environment
     * @param code              The confirmation code
     */
    @Post("project/{projectId}/environment/{environmentId}/deletion_confirmation/{code}")
    @SuccessResponse("200", "OK")
    public async approveDeletionConfirmation(
        @Header("Authorization") auth: string,
        @Path("projectId") projectId: string,
        @Path("environmentId") environmentId: string,
        @Path("code") code: string,
    ): Promise<void> {
        await approveDeletionConfirmation(
            auth, projectId, environmentId, code,
        );
        this.setStatus(200);
    }

    /**
     * Create a new API token.
     *
     *
     * @param auth
     * @param projectId         The project id
     * @param environmentId     The environment id
     */
    @Post("project/{projectId}/token")
    @SuccessResponse("201", "Created")
    public async createApiToken(
        @Header("Authorization") auth: string,
        @Path("projectId") projectId: string,
        @Query("environment_id") environmentId: string,
        @Body() body: ApiTokenValues,
        @Request() req: express.Request,
    ): Promise<ApiTokenResponse> {
        // generate here so audit event can complete first
        const tokenId = uuid.v4().replace(/-/g, "");
        await audit(req, "api_token.create", "c", {
            target: {
                id: tokenId,
                fields: body,
            },
        });

        const newToken = await createApiToken(
            auth,
            projectId,
            environmentId,
            tokenId,
            body,
        );

        this.setStatus(201);

        return {
            project_id: newToken.projectId,
            environment_id: newToken.environmentId,
            created: newToken.created.toISOString(),
            token: newToken.token,
            name: newToken.name,
            disabled: newToken.disabled,
        };
    }

    /**
     * Update an API token's fields.
     *
     *
     * @param auth              Base64 encoded JWT authentication
     * @param projectId         The project id
     * @param apiToken          The token to update
     */
    @Put("project/{projectId}/token/{apiToken}")
    @SuccessResponse("200", "OK")
    public async updateApiToken(
        @Header("Authorization") auth: string,
        @Path("projectId") projectId: string,
        @Path("apiToken") apiToken: string,
        @Body() requestBody: Partial<ApiTokenValues>,
        @Request() req: express.Request,
    ): Promise<ApiTokenResponse> {
        await audit(req, "api_token.update", "u", {
            target: {
                id: apiToken,
            },
            fields: requestBody,
        });

        const updatedToken = await updateApiToken(
            auth, projectId, apiToken, requestBody,
        );

        this.setStatus(200);

        return {
            project_id: updatedToken.projectId,
            environment_id: updatedToken.environmentId,
            created: updatedToken.created.toISOString(),
            token: updatedToken.token,
            name: updatedToken.name,
            disabled: updatedToken.disabled,
        };
    }

    /**
     * Delete an API token.
     *
     *
     * @param auth            Base64 encoded JWT authentication
     * @param projectId       The project id
     * @param tokenId         The token to delete
     */
    @Delete("project/{projectId}/token/{tokenId}")
    @SuccessResponse("204", "Deleted")
    public async deleteApiToken(
        @Header("Authorization") auth: string,
        @Path("projectId") projectId: string,
        @Path("tokenId") tokenId: string,
        @Request() req: express.Request,
    ): Promise<void> {
        await audit(req, "api_token.delete", "d", {
            target: {
                id: tokenId,
            },
        });

        await deleteApiToken(
            auth,
            projectId,
            tokenId,
        );

        this.setStatus(204);
    }
}
