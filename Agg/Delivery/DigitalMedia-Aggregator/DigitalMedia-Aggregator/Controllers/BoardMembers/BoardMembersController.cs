
namespace DigitalMedia.Aggregator.Controllers.BoardMembers
{
    public class BoardMembersController : ApiBaseController
    {
        private IBoardMemberProtoServices _services;

        public BoardMembersController(IBoardMemberProtoServices services)
        {
            _services = services;
        }

        #region Get
        [HttpGet("GetAllBoardMembers")]
        public Task<ResponseDTO> GetAllBoardMembers()
        {
            return _services.GetBoardMembers();
        }
        [HttpGet("GetMemberById/{id}")]
        public Task<ResponseDTO> GetMemberById(string id,bool isInternal)
        {
            return _services.GetByIdBoardMember(id,isInternal);
        }
        #endregion
    }
}
