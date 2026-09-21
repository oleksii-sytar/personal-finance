import {tools} from '@/lib/mcp/catalog'
import {MCP_ORIGIN,MCP_ISSUER} from '@/lib/mcp/security'
export function GET(){
 const paths=Object.fromEntries(tools.map(t=>['/api/v1/'+t.name,{post:{
  operationId:t.name,summary:t.title,description:t.description,security:[{OAuth:['email']}],
  requestBody:{required:true,content:{'application/json':{schema:t.inputSchema}}},
  responses:{'200':{description:'Result or pending confirmation'},'401':{description:'OAuth required'},'403':{description:'Permission denied'},'422':{description:'Invalid arguments'}}
 }}]))
 return Response.json({
  openapi:'3.1.0',info:{title:'Forma finance API',version:'1.0.0',description:'The same guarded actions as MCP. OAuth email identifies the user; Forma consent separately controls financial read/write. Pending actions require approval in Forma.'},
  servers:[{url:MCP_ORIGIN}],paths,
  components:{securitySchemes:{OAuth:{type:'oauth2',flows:{authorizationCode:{
   authorizationUrl:MCP_ISSUER+'/oauth/authorize',tokenUrl:MCP_ISSUER+'/oauth/token',scopes:{email:'User identity. Actual finance permissions are granted in Forma.'}
  }}}}}
 })
}