
namespace DigitalMedia.Aggregator.Controllers.OrgDefination
{
    // [Route("[controller]")]
    public class OrgDefination : ApiBaseController
    {
        private IOrgDefinationServices _services;

        public OrgDefination(IOrgDefinationServices services)
        {
            _services = services;
        }

        [HttpGet]
        public Task<ResponseDTO> GetAllOrgDefination(string? search, bool? flitercheckRequesterForm)
        {
            return _services.GetAllOrgDefinations(search,flitercheckRequesterForm);
        }

        [HttpGet("{id}")]
        public Task<ResponseDTO> GetOrgDefinitionById(string id)
        {
            return _services.GetByIdOrgDefination(id);
        }
        [HttpGet("GetOrgWithoutContentById/{id}")]
        public Task<ResponseDTO> GetOrgWithoutContentById(string id)
        {
            return _services.GetOrgWithoutContentById(id);
        }

        [HttpGet("GetByIdOrgDefinationContent/{orgId}/{sectionId}/{inputId}")]
        public Task<ResponseDTO> GetByIdOrgDefinationContent(string orgId, string sectionId,string inputId)
        {
            return _services.GetByIdOrgDefinationContent(orgId,sectionId,inputId);
        }
    }
}
